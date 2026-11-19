import type { BagLine, BagProblem, Customer, Order, OrderStatus, Product, ProductInput, Settings, StockPatch, Variant } from "@hv/core";
import type { RefundInput } from "@hv/core";
import type { RefundPlan } from "./logic";

/** A variant with the product fields checkout needs, read inside the same transaction. */
export interface VariantWithProduct {
  variant: Variant;
  productId: string;
  productTitle: string;
  productStatus: Product["status"];
}

export type CreateOrderResult = { ok: true; order: Order } | { ok: false; problems: BagProblem[] };

export interface Entry {
  product: Product;
  variants: Variant[];
}

export type SaveProductResult =
  | { ok: true; entry: Entry }
  | { ok: false; reason: "exists" | "not_found" | "slug_taken" }
  | { ok: false; reason: "held"; variantId: string; held: number };

export type StockResult =
  | { ok: true; variant: Variant }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "held"; variantId: string; held: number };

export type MoveResult = { ok: true; order: Order } | { ok: false; reason: "not_found" } | { ok: false; reason: "refused"; message: string };

export interface MarkPaidResult {
  order: Order;
  /** False when the order was already paid (repeated webhook): nothing changed. */
  changed: boolean;
}

/**
 * Persistence for the Worker. Every method that touches stock is atomic:
 * Firestore runs it in one transaction; the in-memory store runs it without awaiting mid-way.
 */
export interface Store {
  listCatalogueEntries(): Promise<{ product: Product; variants: Variant[] }[]>;
  getSettings(): Promise<Settings>;

  /**
   * Reads the variants, rejects unknown/unavailable ones, then calls `makeOrder`
   * (pure: pricing + ids) and reserves stock + writes the pending order together.
   * `makeOrder` may run more than once if the transaction retries.
   */
  createPendingOrder(lines: BagLine[], makeOrder: (variants: Map<string, VariantWithProduct>) => Order): Promise<CreateOrderResult>;

  /** Pending → paid, reserved → sold, customer updated. Idempotent. Null if the order doesn't exist. */
  markPaid(orderId: string, paidAt: string): Promise<MarkPaidResult | null>;

  /** Pending → cancelled, reservation released. No-op for any other status. */
  cancelPending(orderId: string, at: string): Promise<Order | null>;

  /** Cancels pending orders whose hold ended before `now`. Returns how many. */
  expireOverdue(now: string): Promise<number>;

  getOrder(orderId: string): Promise<Order | null>;
  getOrderByNumber(number: string): Promise<Order | null>;
  getCustomer(id: string): Promise<Customer | null>;

  /* ---------- Dashboard ---------- */

  /** Every product, any status, with its variants. */
  listAllEntries(): Promise<Entry[]>;
  getEntry(productId: string): Promise<Entry | null>;
  /**
   * Creates or replaces a product and its variants in one transaction. Stock held by
   * shoppers mid-checkout is kept: stock can't drop below it, and a variant with a hold can't be removed.
   */
  saveProduct(productId: string, input: ProductInput, now: string, mode: "create" | "update"): Promise<SaveProductResult>;
  setStock(variantId: string, patch: StockPatch): Promise<StockResult>;
  /** Orders in these states, most recently paid first. */
  listOrders(statuses: readonly OrderStatus[], limit: number): Promise<Order[]>;
  /** Orders paid at or after `since` (ISO), most recent first. */
  listPaidSince(since: string, limit: number): Promise<Order[]>;
  /** A move on the orders board (see moveOrder in @hv/core). */
  moveOrder(orderId: string, to: OrderStatus, at: string): Promise<MoveResult>;
  /** Owner cancels a paid order and records the bank-transfer refund; optionally restocks. One transaction. */
  refundOrder(orderId: string, input: RefundInput, by: string, at: string): Promise<RefundPlan>;
  addPushToken(token: string): Promise<void>;
  removePushTokens(tokens: readonly string[]): Promise<void>;
}

/** Most push devices kept; the oldest is dropped when a new one registers. */
export const MAX_PUSH_TOKENS = 10;

/** Customers are keyed by lower-cased email. */
export function customerId(email: string): string {
  return email.trim().toLowerCase();
}
