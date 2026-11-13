import { add, multiply, sum, type Currency, type Money } from "./money";
import type { BagLine, DeliveryZone, OrderItem, OrderStatus, Unit } from "./schemas";

/** Everything needed to price one variant, as read inside the checkout transaction. */
export interface PricingVariant {
  id: string;
  productId: string;
  title: string;
  variantLabel: string;
  unit?: Unit;
  price: Money;
}

export interface PricedOrder {
  items: OrderItem[];
  totals: { subtotal: Money; delivery: Money; total: Money };
  currency: Currency;
}

/** Prices a validated bag on the server. Client-side prices are never trusted. */
export function priceOrder(
  lines: readonly BagLine[],
  variants: ReadonlyMap<string, PricingVariant>,
  zone: DeliveryZone,
): PricedOrder {
  if (lines.length === 0) throw new RangeError("Bag is empty");
  const currency = zone.fee.currency;
  const items: OrderItem[] = lines.map((l) => {
    const v = variants.get(l.variantId);
    if (!v) throw new RangeError(`Unknown variant ${l.variantId}`);
    if (v.price.currency !== currency) throw new TypeError("Mixed currencies in one order");
    return {
      productId: v.productId,
      variantId: v.id,
      title: v.title,
      variantLabel: v.variantLabel,
      ...(v.unit ? { unit: v.unit } : {}),
      qty: l.qty,
      unitPrice: v.price,
    };
  });
  const subtotal = sum(
    items.map((i) => multiply(i.unitPrice, i.qty)),
    currency,
  );
  return { items, totals: { subtotal, delivery: zone.fee, total: add(subtotal, zone.fee) }, currency };
}

/** Unambiguous characters only (no 0/O, 1/I/L), so it can be read out over the phone. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Human order number, e.g. "HV-7K3M9Q". 31^6 ≈ 887M combinations; the Worker retries on collision. */
export function newOrderNumber(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(6);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `HV-${out}`;
}

/**
 * Allowed status moves. Dashboard and Worker both check against this.
 * One step back (packed → paid, shipped → packed) is allowed so a mis-tap on the
 * orders board can be undone. Cancelling a paid order needs a refund, so the
 * dashboard doesn't offer it in Phase 1.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped", "paid", "cancelled"],
  shipped: ["delivered", "packed"],
  delivered: ["shipped"],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

const STAMP: Partial<Record<OrderStatus, "packedAt" | "shippedAt" | "deliveredAt">> = {
  packed: "packedAt",
  shipped: "shippedAt",
  delivered: "deliveredAt",
};

const FORWARD: OrderStatus[] = ["pending", "paid", "packed", "shipped", "delivered"];

/**
 * A move on the orders board (New → Packed → Sent → Delivered, or one step back).
 * Payment states (pending, paid from pending, cancelled) belong to the Worker and are refused here.
 * Moving forward stamps the time; stepping back clears the stamp of the step undone.
 */
export function moveOrder<O extends { status: OrderStatus; packedAt?: string; shippedAt?: string; deliveredAt?: string }>(
  order: O,
  to: OrderStatus,
  at: string,
): O {
  const back = FORWARD.indexOf(to) < FORWARD.indexOf(order.status);
  if (to === "pending" || to === "cancelled" || order.status === "pending" || order.status === "cancelled") {
    throw new RangeError("Payment states are set by the Worker, not the board");
  }
  if (!canTransition(order.status, to)) throw new RangeError(`Can't move an order from ${order.status} to ${to}`);
  const next = { ...order, status: to };
  if (back) {
    const undone = STAMP[order.status];
    if (undone) delete next[undone];
  } else {
    const stamp = STAMP[to];
    if (stamp) next[stamp] = at;
  }
  return next;
}
