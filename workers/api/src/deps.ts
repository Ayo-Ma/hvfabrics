import type { PaystackClient } from "@hv/core";
import type { Store } from "./store/types";
import type { AdminVerifier } from "./auth/firebase";
import type { Notifier } from "./services/notify";
import type { Pusher } from "./services/push";

/** The subset of KV the Worker uses (so tests can pass a Map-backed fake). */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface LimiterLike {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface EventsLike {
  writeDataPoint(p: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

/** The subset of an R2 bucket the Worker uses. */
export interface BucketLike {
  put(key: string, value: Uint8Array, opts: { httpMetadata: { contentType: string; cacheControl?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpEtag: string; httpMetadata?: { contentType?: string; cacheControl?: string } } | null>;
}

export interface Deps {
  store: Store;
  kv: KvLike;
  /** Null when PAYSTACK_SECRET_KEY isn't set: checkout answers 503 instead of pretending. */
  paystack: Pick<PaystackClient, "initialize" | "verify"> | null;
  paystackSecret: string | null;
  notify: Notifier;
  /** Null until the Firebase service account is set: no push alerts. */
  push: Pusher | null;
  /** Product photos (R2). Null when the binding is missing. */
  images: BucketLike | null;
  /** Checks dashboard sign-ins. */
  admin: AdminVerifier;
  dashboardOrigin: string;
  checkoutLimiter?: LimiterLike;
  searchLimiter?: LimiterLike;
  events?: EventsLike;
  storefrontOrigin: string;
  /** True when serving the placeholder seed data (development only). */
  placeholderData: boolean;
  now: () => Date;
  waitUntil: (p: Promise<unknown>) => void;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}
