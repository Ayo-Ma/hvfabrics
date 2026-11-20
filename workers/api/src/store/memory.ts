import type { RefundInput } from "@hv/core";
import type { RefundPlan } from "./logic";
import type { BagLine, Customer, Order, OrderStatus, Product, ProductInput, Settings, StockPatch, Variant } from "@hv/core";
import { byPaidDesc, planCancel,
  planRefund, planMove, planPayment, planProductSave, planReservation, planStock, variantIdsOf, withPushToken } from "./logic";
import {
  customerId,
  type CreateOrderResult,
  type Entry,
  type MarkPaidResult,
  type MoveResult,
  type SaveProductResult,
  type StockResult,
  type Store,
  type VariantWithProduct,
} from "./types";

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
  private settings: Settings;

  constructor(entries: { product: Product; variants: Variant[] }[], settings: Settings) {
    this.settings = structuredClone(settings);
    for (const { product, variants } of entries) {
      this.products.set(product.id, structuredClone(product));
      for (const v of variants) this.variants.set(v.id, { productId: product.id, variant: structuredClone(v) });
    }
  }

  async listCatalogueEntries() {
    return this.listAllEntries();
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

  /* ---------------- Dashboard ---------------- */

  async listAllEntries(): Promise<Entry[]> {
    return [...this.products.keys()].map((id) => this.entry(id)!);
  }

  async getEntry(productId: string): Promise<Entry | null> {
    return this.entry(productId);
  }

  async saveProduct(productId: string, input: ProductInput, now: string, mode: "create" | "update"): Promise<SaveProductResult> {
    const slugOwner = [...this.products.values()].find((p) => p.slug === input.slug)?.id ?? null;
    const plan = planProductSave(productId, input, this.entry(productId), slugOwner, now, mode);
    if (!plan.ok) return plan;
    this.products.set(productId, structuredClone(plan.entry.product));
    for (const id of plan.deleted) this.variants.delete(id);
    for (const v of plan.entry.variants) this.variants.set(v.id, { productId, variant: structuredClone(v) });
    return { ok: true, entry: structuredClone(plan.entry) };
  }

  async setStock(variantId: string, patch: StockPatch): Promise<StockResult> {
    const rec = this.variants.get(variantId);
    const plan = planStock(rec?.variant, patch);
    if (plan.ok) rec!.variant = structuredClone(plan.variant);
    return plan;
  }

  async listOrders(statuses: readonly OrderStatus[], limit: number): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => statuses.includes(o.status))
      .sort(byPaidDesc)
      .slice(0, limit)
      .map((o) => structuredClone(o));
  }

  async listAwaitingTransfer(limit: number): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.status === "pending" && o.payment === "transfer")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map((o) => structuredClone(o));
  }

  async listPaidSince(since: string, limit: number): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.paidAt !== undefined && o.paidAt >= since)
      .sort(byPaidDesc)
      .slice(0, limit)
      .map((o) => structuredClone(o));
  }

  async moveOrder(orderId: string, to: OrderStatus, at: string): Promise<MoveResult> {
    const plan = planMove(this.orders.get(orderId) ?? null, to, at);
    if (plan.ok) this.orders.set(orderId, structuredClone(plan.order));
    return plan;
  }

  async refundOrder(orderId: string, input: RefundInput, by: string, at: string): Promise<RefundPlan> {
    const order = this.orders.get(orderId) ?? null;
    const plan = planRefund(order, order ? this.variantMap(order) : new Map(), input, by, at);
    if (!plan.ok) return plan;
    for (const v of plan.variants) this.variants.get(v.id)!.variant = v;
    this.orders.set(orderId, structuredClone(plan.order));
    return { ...plan, order: structuredClone(plan.order) };
  }

  async addPushToken(token: string): Promise<void> {
    const t = this.settings.notificationTargets;
    t.pushTokens = withPushToken(t.pushTokens, token);
  }

  async removePushTokens(tokens: readonly string[]): Promise<void> {
    const t = this.settings.notificationTargets;
    t.pushTokens = t.pushTokens.filter((x) => !tokens.includes(x));
  }

  private entry(productId: string): Entry | null {
    const product = this.products.get(productId);
    if (!product) return null;
    return {
      product: structuredClone(product),
      variants: [...this.variants.values()].filter((v) => v.productId === productId).map((v) => structuredClone(v.variant)),
    };
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
