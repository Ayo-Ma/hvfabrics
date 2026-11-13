import type { BagLine, BagProblem, Customer, Order, Product, Settings, Variant } from "@hv/core";

/** A variant with the product fields checkout needs, read inside the same transaction. */
export interface VariantWithProduct {
  variant: Variant;
  productId: string;
  productTitle: string;
  productStatus: Product["status"];
}

export type CreateOrderResult = { ok: true; order: Order } | { ok: false; problems: BagProblem[] };

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
}

/** Customers are keyed by lower-cased email. */
export function customerId(email: string): string {
  return email.trim().toLowerCase();
}
