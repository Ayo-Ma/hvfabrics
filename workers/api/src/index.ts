import { PaystackClient } from "@hv/core";
import { seedEntries, seedSettings } from "@hv/core/seed";
import { createApp, runScheduled } from "./app";
import { DevVerifier, FirebaseVerifier, type AdminVerifier } from "./auth/firebase";
import type { Deps } from "./deps";
import { LogNotifier, ResendNotifier } from "./services/notify";
import { FcmPusher } from "./services/push";
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
  /** End-to-end tests only: a local Paystack stand-in. Ignored in production. */
  PAYSTACK_API_BASE?: string;
}
type WorkerEnv = Env & Secrets;

// Per-isolate singletons: the dev store must survive between requests; the Google token is cached.
let memoryStore: MemoryStore | undefined;
let firebase: { key: string; store: FirestoreStore; push: FcmPusher; verifier: FirebaseVerifier } | undefined;
const devVerifier = new DevVerifier();

function backendFor(env: WorkerEnv): { store: Store; placeholder: boolean; push: FcmPusher | null; admin: AdminVerifier } {
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    const key = env.FIREBASE_SERVICE_ACCOUNT;
    if (!firebase || firebase.key !== key) {
      const sa = ServiceAccountSchema.parse(JSON.parse(key));
      // The key says which project it belongs to; a mistyped FIREBASE_PROJECT_ID can't work with it
      // (it caused an outage on 2026-11-17), so trust the key and warn about the mismatch.
      const projectId = sa.project_id;
      if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PROJECT_ID !== sa.project_id) {
        console.warn(JSON.stringify({ msg: "FIREBASE_PROJECT_ID doesn't match the service account; using the key's project", key: sa.project_id }));
      }
      const auth = new GoogleAuth(sa);
      firebase = {
        key,
        store: new FirestoreStore(projectId, auth),
        push: new FcmPusher(projectId, auth),
        verifier: new FirebaseVerifier(projectId),
      };
    }
    return { store: firebase.store, placeholder: false, push: firebase.push, admin: firebase.verifier };
  }
  if (env.ENVIRONMENT === "production") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is required in production; refusing to use placeholder data.");
  }
  // Placeholder data only: dev sign-in tokens are accepted here and nowhere else.
  memoryStore ??= new MemoryStore(seedEntries, seedSettings);
  return { store: memoryStore, placeholder: true, push: null, admin: devVerifier };
}

function paystackFor(env: WorkerEnv, key: string): PaystackClient {
  const base = env.PAYSTACK_API_BASE;
  if (base && env.ENVIRONMENT === "production") {
    throw new Error("PAYSTACK_API_BASE is for end-to-end tests only; refusing to send payments elsewhere in production.");
  }
  return base ? new PaystackClient(key, undefined, base) : new PaystackClient(key);
}

function depsFrom(env: WorkerEnv, ctx: { waitUntil(p: Promise<unknown>): void }): Deps {
  const { store, placeholder, push, admin } = backendFor(env);
  const log = (msg: string, extra?: Record<string, unknown>) => console.log(JSON.stringify({ msg, ...extra }));
  return {
    store,
    kv: env.CATALOGUE,
    paystack: env.PAYSTACK_SECRET_KEY ? paystackFor(env, env.PAYSTACK_SECRET_KEY) : null,
    paystackSecret: env.PAYSTACK_SECRET_KEY ?? null,
    notify: env.RESEND_API_KEY
      ? new ResendNotifier(env.RESEND_API_KEY, env.EMAIL_FROM, env.STOREFRONT_ORIGIN)
      : new LogNotifier(log),
    push,
    images: env.IMAGES ?? null,
    admin,
    dashboardOrigin: env.DASHBOARD_ORIGIN,
    checkoutLimiter: env.CHECKOUT_LIMITER,
    searchLimiter: env.SEARCH_LIMITER,
    events: env.EVENTS,
    storefrontOrigin: env.STOREFRONT_ORIGIN,
    paymentMode: env.PAYMENT_MODE === "transfer" ? "transfer" : "card",
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
