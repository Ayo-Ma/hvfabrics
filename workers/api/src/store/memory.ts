import type { BagLine, Customer, Order, Product, Settings, Variant } from "@hv/core";
import { planCancel, planPayment, planReservation, variantIdsOf } from "./logic";
import { customerId, type CreateOrderResult, type MarkPaidResult, type Store, type VariantWithProduct } from "./types";

/**
 * In-memory store for local development and tests. JavaScript runs one task at a time,
 * and no method awaits between reading and writing, so each method is atomic —
 * the same guarantee a Firestore transaction gives.
 * Data lives as long as the Worker isolate: it resets when wrangler dev restarts.
 */
export class MemoryStore implements Store {
  private products = new Map<string, Product>();
  private variants = new Map<string, { productId: string; variant: Variant }>();
  private orders = new Map<string, Order>();
  private customers = new Map<string, Customer>();

  constructor(
    entries: { product: Product; variants: Variant[] }[],
    private settings: Settings,
  ) {
    for (const { product, variants } of entries) {
      this.products.set(product.id, structuredClone(product));
      for (const v of variants) this.variants.set(v.id, { productId: product.id, variant: structuredClone(v) });
    }
  }

  async listCatalogueEntries() {
    return [...this.products.values()].map((product) => ({
      product: structuredClone(product),
      variants: [...this.variants.values()].filter((v) => v.productId === product.id).map((v) => structuredClone(v.variant)),
    }));
  }

  async getSettings() {
    return structuredClone(this.settings);
  }

  async createPendingOrder(lines: BagLine[], makeOrder: (v: Map<string, VariantWithProduct>) => Order): Promise<CreateOrderResult> {
    const found = new Map<string, VariantWithProduct>();
    for (const l of lines) {
      const rec = this.variants.get(l.variantId);
      const product = rec && this.products.get(rec.productId);
      if (rec && product) {
        found.set(l.variantId, {
          variant: structuredClone(rec.variant),
          productId: product.id,
          productTitle: product.title,
          productStatus: product.status,
        });
      }
    }
    const plan = planReservation(lines, found);
    if (!plan.ok) return plan;
    const order = makeOrder(found);
    for (const v of plan.reserved) this.variants.get(v.id)!.variant = v;
    this.orders.set(order.id, structuredClone(order));
    return { ok: true, order };
  }

  async markPaid(orderId: string, paidAt: string): Promise<MarkPaidResult | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    const vars = this.variantMap(order);
    const cid = customerId(order.customer.email);
    const plan = planPayment(order, vars, this.customers.get(cid) ?? null, paidAt);
    if (!plan.changed) return { order: structuredClone(order), changed: false };
    for (const v of plan.variants) this.variants.get(v.id)!.variant = v;
    this.orders.set(orderId, plan.order);
    this.customers.set(cid, plan.customer);
    return { order: structuredClone(plan.order), changed: true };
  }

  async cancelPending(orderId: string, at: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    const plan = planCancel(order, this.variantMap(order), at);
    if (!plan.changed) return structuredClone(order);
    for (const v of plan.variants) this.variants.get(v.id)!.variant = v;
    this.orders.set(orderId, plan.order);
    return structuredClone(plan.order);
  }

  async expireOverdue(now: string): Promise<number> {
    let n = 0;
    for (const o of [...this.orders.values()]) {
      if (o.status === "pending" && o.reservedUntil && o.reservedUntil < now) {
        await this.cancelPending(o.id, now);
        n++;
      }
    }
    return n;
  }

  async getOrder(orderId: string) {
    const o = this.orders.get(orderId);
    return o ? structuredClone(o) : null;
  }

  async getOrderByNumber(number: string) {
    const o = [...this.orders.values()].find((x) => x.number === number);
    return o ? structuredClone(o) : null;
  }

  async getCustomer(id: string) {
    const c = this.customers.get(id);
    return c ? structuredClone(c) : null;
  }

  /** Test helper: current stock of a variant. */
  peekVariant(id: string): Variant | undefined {
    const v = this.variants.get(id)?.variant;
    return v ? structuredClone(v) : undefined;
  }

  private variantMap(order: Order): Map<string, Variant> {
    return new Map(
      variantIdsOf(order).flatMap((id) => {
        const v = this.variants.get(id)?.variant;
        return v ? [[id, v] as const] : [];
      }),
    );
  }
}
