import {
  add,
  available,
  commitSale,
  release,
  reserve,
  validateBag,
  type BagLine,
  type BagProblem,
  moveOrder,
  type Customer,
  type Order,
  type OrderStatus,
  type Product,
  type ProductInput,
  type StockPatch,
  type Variant,
  type Refund,
  type RefundInput,
} from "@hv/core";
import { customerId, MAX_PUSH_TOKENS, type Entry, type MoveResult, type SaveProductResult, type StockResult, type VariantWithProduct } from "./types";

/**
 * Pure state transitions shared by every Store implementation, so the in-memory
 * store used in tests and the Firestore store behave identically.
 */

export function planReservation(
  lines: BagLine[],
  found: Map<string, VariantWithProduct>,
): { ok: true; merged: BagLine[]; reserved: Variant[] } | { ok: false; problems: BagProblem[] } {
  // Draft or archived products can't be bought even if a stale bag still holds them.
  const buyable = new Map(
    [...found].filter(([, v]) => v.productStatus === "live").map(([id, v]) => [id, v.variant] as const),
  );
  const check = validateBag(lines, buyable);
  if (!check.ok) return check;
  const reserved = check.merged.map((l) => reserve(buyable.get(l.variantId)!, l.qty));
  return { ok: true, merged: check.merged, reserved };
}

export const SHORTFALL_FLAG = "paid_after_expiry_stock_short";

export function planPayment(
  order: Order,
  variants: Map<string, Variant>,
  customer: Customer | null,
  paidAt: string,
): { changed: false } | { changed: true; order: Order; variants: Variant[]; customer: Customer } {
  if (order.status !== "pending" && order.status !== "cancelled") return { changed: false };
  // Refunded by the owner: a repeated or late Paystack confirmation must not revive it.
  if (order.refund) return { changed: false };

  const updated: Variant[] = [];
  const flags = new Set(order.flags ?? []);
  for (const item of order.items) {
    const v = variants.get(item.variantId);
    if (!v) {
      flags.add(SHORTFALL_FLAG);
      continue;
    }
    if (order.status === "pending") {
      updated.push(commitSale(v, item.qty));
    } else if (available(v) >= item.qty) {
      // The hold expired before Paystack confirmed, but the stock is still there: take it now.
      updated.push({ ...v, stock: v.stock - item.qty });
    } else {
      // Paid, but someone else bought the last units. She must contact the customer.
      flags.add(SHORTFALL_FLAG);
    }
  }

  const paidOrder: Order = {
    ...order,
    status: "paid",
    paidAt,
    ...(flags.size ? { flags: [...flags] } : {}),
  };
  return { changed: true, order: paidOrder, variants: updated, customer: planCustomer(customer, paidOrder, paidAt) };
}

export function planCustomer(existing: Customer | null, order: Order, at: string): Customer {
  const id = customerId(order.customer.email);
  if (!existing) {
    return {
      id,
      email: order.customer.email,
      phone: order.customer.phone,
      name: order.customer.name,
      ...(order.country ? { country: order.country } : {}),
      ordersCount: 1,
      totalSpent: order.totals.total,
      firstOrderAt: at,
      lastOrderAt: at,
      tags: [],
    };
  }
  const sameCurrency = existing.totalSpent.currency === order.totals.total.currency;
  return {
    ...existing,
    name: order.customer.name,
    phone: order.customer.phone,
    ordersCount: existing.ordersCount + 1,
    totalSpent: sameCurrency ? add(existing.totalSpent, order.totals.total) : existing.totalSpent,
    lastOrderAt: at,
  };
}

export function planCancel(
  order: Order,
  variants: Map<string, Variant>,
  at: string,
): { changed: false } | { changed: true; order: Order; variants: Variant[] } {
  if (order.status !== "pending") return { changed: false };
  const updated = order.items.flatMap((i) => {
    const v = variants.get(i.variantId);
    return v ? [release(v, i.qty)] : [];
  });
  return { changed: true, order: { ...order, status: "cancelled", cancelledAt: at }, variants: updated };
}

export type RefundPlan =
  | { ok: false; reason: "not_found" | "invalid"; message: string }
  | { ok: true; order: Order; variants: Variant[] };

/**
 * Owner cancels a paid (or packed) order and refunds it by bank transfer. Stock goes back only when
 * she says so (cut fabric can't), and never for lines the payment didn't take (the shortfall case).
 */
export function planRefund(order: Order | null, variants: Map<string, Variant>, input: RefundInput, by: string, at: string): RefundPlan {
  if (!order) return { ok: false, reason: "not_found", message: "Not found" };
  if (order.status !== "paid" && order.status !== "packed") {
    return { ok: false, reason: "invalid", message: order.status === "cancelled" ? "This order is already cancelled." : "Only paid orders that haven't been sent can be cancelled and refunded." };
  }
  const restock = input.restock && !(order.flags ?? []).includes(SHORTFALL_FLAG);
  const updated = restock
    ? order.items.flatMap((i) => {
        const v = variants.get(i.variantId);
        return v ? [{ ...v, stock: v.stock + i.qty }] : [];
      })
    : [];
  const refund: Refund = {
    amount: order.totals.total,
    method: "bank_transfer",
    ...(input.reference ? { reference: input.reference } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    restocked: restock,
    by,
    at,
  };
  return { ok: true, order: { ...order, status: "cancelled", cancelledAt: at, refund }, variants: updated };
}

/** Multiple lines of one order can touch the same variant only once after merging, but guard anyway. */
export function variantIdsOf(order: Order): string[] {
  return [...new Set(order.items.map((i) => i.variantId))];
}

/* ---------------- Dashboard ---------------- */

export type ProductPlan =
  | Exclude<SaveProductResult, { ok: true }>
  | { ok: true; entry: Entry; deleted: string[] };

/** Builds the product and variants to write, keeping shoppers' holds intact. */
export function planProductSave(
  productId: string,
  input: ProductInput,
  existing: Entry | null,
  slugTakenBy: string | null,
  now: string,
  mode: "create" | "update",
): ProductPlan {
  if (mode === "create" && existing) return { ok: false, reason: "exists" };
  if (mode === "update" && !existing) return { ok: false, reason: "not_found" };
  if (slugTakenBy && slugTakenBy !== productId) return { ok: false, reason: "slug_taken" };

  const before = new Map((existing?.variants ?? []).map((v) => [v.id, v]));
  const variants: Variant[] = [];
  for (const v of input.variants) {
    const id = `${productId}--${v.key}`;
    const held = before.get(id)?.reserved ?? 0;
    if (v.stock < held) return { ok: false, reason: "held", variantId: id, held };
    variants.push({
      id,
      sku: v.sku,
      options: {
        unit: v.options.unit,
        ...(v.options.colour ? { colour: v.options.colour } : {}),
        ...(v.options.size ? { size: v.options.size } : {}),
      },
      price: v.price,
      stock: v.stock,
      reserved: held,
      lowStockAt: v.lowStockAt,
    });
  }
  const kept = new Set(variants.map((v) => v.id));
  const deleted: string[] = [];
  for (const [id, v] of before) {
    if (kept.has(id)) continue;
    if (v.reserved > 0) return { ok: false, reason: "held", variantId: id, held: v.reserved };
    deleted.push(id);
  }
  const { variants: _inputVariants, ...fields } = input;
  const product: Product = {
    id: productId,
    ...fields,
    createdAt: existing?.product.createdAt ?? now,
    updatedAt: now,
  };
  return { ok: true, entry: { product, variants }, deleted };
}

export function planStock(v: Variant | undefined, patch: StockPatch): StockResult {
  if (!v) return { ok: false, reason: "not_found" };
  const next = { ...v, ...(patch.stock !== undefined ? { stock: patch.stock } : {}), ...(patch.lowStockAt !== undefined ? { lowStockAt: patch.lowStockAt } : {}) };
  if (next.stock < next.reserved) return { ok: false, reason: "held", variantId: v.id, held: v.reserved };
  return { ok: true, variant: next };
}

export function planMove(order: Order | null, to: OrderStatus, at: string): MoveResult {
  if (!order) return { ok: false, reason: "not_found" };
  try {
    return { ok: true, order: moveOrder(order, to, at) };
  } catch (e) {
    return { ok: false, reason: "refused", message: e instanceof Error ? e.message : String(e) };
  }
}

export function withPushToken(tokens: readonly string[], token: string): string[] {
  return [...tokens.filter((t) => t !== token), token].slice(-MAX_PUSH_TOKENS);
}

/** Most recent payment first; orders without a payment time fall back to when they were made. */
export function byPaidDesc(a: Order, b: Order): number {
  return (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt);
}
