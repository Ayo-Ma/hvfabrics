import type { PaystackClient } from "@hv/core";
import type { Store } from "./store/types";
import type { Notifier } from "./services/notify";

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

export interface Deps {
  store: Store;
  kv: KvLike;
  /** Null when PAYSTACK_SECRET_KEY isn't set: checkout answers 503 instead of pretending. */
  paystack: Pick<PaystackClient, "initialize" | "verify"> | null;
  paystackSecret: string | null;
  notify: Notifier;
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
