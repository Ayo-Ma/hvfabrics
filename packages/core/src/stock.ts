import type { BagLine, Variant } from "./schemas";

/**
 * Pure stock rules. The Worker runs these inside a single Firestore transaction,
 * so the maths here is the single source of truth for "can this be bought?".
 */

export const RESERVATION_MINUTES = 15;

export function available(v: Pick<Variant, "stock" | "reserved">): number {
  return Math.max(0, v.stock - v.reserved);
}

export class StockError extends Error {
  constructor(
    message: string,
    readonly variantId: string,
  ) {
    super(message);
    this.name = "StockError";
  }
}

export type BagProblem =
  | { variantId: string; kind: "not_found" }
  | { variantId: string; kind: "sold_out" }
  | { variantId: string; kind: "insufficient"; available: number; requested: number };

/** Checks every bag line against live stock. Duplicate lines for one variant are added together. */
export function validateBag(
  lines: readonly BagLine[],
  variants: ReadonlyMap<string, Pick<Variant, "id" | "stock" | "reserved">>,
): { ok: true; merged: BagLine[] } | { ok: false; problems: BagProblem[] } {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.qty);

  const problems: BagProblem[] = [];
  for (const [variantId, requested] of merged) {
    const v = variants.get(variantId);
    if (!v) {
      problems.push({ variantId, kind: "not_found" });
      continue;
    }
    const avail = available(v);
    if (avail === 0) problems.push({ variantId, kind: "sold_out" });
    else if (requested > avail) problems.push({ variantId, kind: "insufficient", available: avail, requested });
  }
  if (problems.length) return { ok: false, problems };
  return { ok: true, merged: [...merged].map(([variantId, qty]) => ({ variantId, qty })) };
}

/** Hold units for a pending order. */
export function reserve<V extends Pick<Variant, "id" | "stock" | "reserved">>(v: V, qty: number): V {
  assertQty(qty);
  if (available(v) < qty) throw new StockError(`Only ${available(v)} left`, v.id);
  return { ...v, reserved: v.reserved + qty };
}

/** Give back units from an expired or cancelled pending order. */
export function release<V extends Pick<Variant, "id" | "stock" | "reserved">>(v: V, qty: number): V {
  assertQty(qty);
  return { ...v, reserved: Math.max(0, v.reserved - qty) };
}

/** Payment confirmed: reserved units become sold. */
export function commitSale<V extends Pick<Variant, "id" | "stock" | "reserved">>(v: V, qty: number): V {
  assertQty(qty);
  if (v.reserved < qty || v.stock < qty) {
    throw new StockError("Cannot sell more than was reserved", v.id);
  }
  return { ...v, stock: v.stock - qty, reserved: v.reserved - qty };
}

export function reservationExpiry(from: Date): Date {
  return new Date(from.getTime() + RESERVATION_MINUTES * 60_000);
}

/** Paying by bank transfer: the items are held this long for the money to arrive and the owner to confirm it. */
export const TRANSFER_HOLD_HOURS = 24;

export function transferHoldExpiry(from: Date): Date {
  return new Date(from.getTime() + TRANSFER_HOLD_HOURS * 3_600_000);
}

function assertQty(qty: number): void {
  if (!Number.isSafeInteger(qty) || qty < 1) throw new RangeError(`Invalid quantity ${qty}`);
}
