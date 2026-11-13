import {
  add,
  available,
  commitSale,
  release,
  reserve,
  validateBag,
  type BagLine,
  type BagProblem,
  type Customer,
  type Order,
  type Variant,
} from "@hv/core";
import { customerId, type VariantWithProduct } from "./types";

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

/** Multiple lines of one order can touch the same variant only once after merging, but guard anyway. */
export function variantIdsOf(order: Order): string[] {
  return [...new Set(order.items.map((i) => i.variantId))];
}
