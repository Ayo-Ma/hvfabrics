import { PaystackClient } from "@hv/core";
import { seedEntries, seedSettings } from "@hv/core/seed";
import { createApp, runScheduled } from "./app";
import type { Deps } from "./deps";
import { LogNotifier, ResendNotifier } from "./services/notify";
import { FirestoreStore } from "./store/firestore";
import { GoogleAuth, ServiceAccountSchema } from "./store/google-auth";
import { MemoryStore } from "./store/memory";
import type { Store } from "./store/types";

/** Secrets come from `wrangler secret put` (production) or `.dev.vars` (local); never from the repo. */
interface Secrets {
  PAYSTACK_SECRET_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  RESEND_API_KEY?: string;
}
type WorkerEnv = Env & Secrets;

// Per-isolate singletons: the dev store must survive between requests; the Google token is cached.
let memoryStore: MemoryStore | undefined;
let firestore: { key: string; store: FirestoreStore } | undefined;

function storeFor(env: WorkerEnv): { store: Store; placeholder: boolean } {
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    const key = env.FIREBASE_SERVICE_ACCOUNT;
    if (!firestore || firestore.key !== key) {
      const sa = ServiceAccountSchema.parse(JSON.parse(key));
      firestore = { key, store: new FirestoreStore(env.FIREBASE_PROJECT_ID || sa.project_id, new GoogleAuth(sa)) };
    }
    return { store: firestore.store, placeholder: false };
  }
  if (env.ENVIRONMENT === "production") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is required in production; refusing to use placeholder data.");
  }
  memoryStore ??= new MemoryStore(seedEntries, seedSettings);
  return { store: memoryStore, placeholder: true };
}

function depsFrom(env: WorkerEnv, ctx: { waitUntil(p: Promise<unknown>): void }): Deps {
  const { store, placeholder } = storeFor(env);
  const log = (msg: string, extra?: Record<string, unknown>) => console.log(JSON.stringify({ msg, ...extra }));
  return {
    store,
    kv: env.CATALOGUE,
    paystack: env.PAYSTACK_SECRET_KEY ? new PaystackClient(env.PAYSTACK_SECRET_KEY) : null,
    paystackSecret: env.PAYSTACK_SECRET_KEY ?? null,
    notify: env.RESEND_API_KEY
      ? new ResendNotifier(env.RESEND_API_KEY, env.EMAIL_FROM, env.STOREFRONT_ORIGIN)
      : new LogNotifier(log),
    checkoutLimiter: env.CHECKOUT_LIMITER,
    searchLimiter: env.SEARCH_LIMITER,
    events: env.EVENTS,
    storefrontOrigin: env.STOREFRONT_ORIGIN,
    placeholderData: placeholder,
    now: () => new Date(),
    waitUntil: (p) => ctx.waitUntil(p),
    log,
  };
}

const app = createApp((c) => depsFrom(c.env as WorkerEnv, c.executionCtx));

export default {
  fetch: app.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduled(depsFrom(env, ctx)));
  },
} satisfies ExportedHandler<WorkerEnv>;
