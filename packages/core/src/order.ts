import { add, multiply, sum, type Currency, type Money } from "./money";
import type { BagLine, DeliveryZone, OrderItem, OrderStatus } from "./schemas";

/** Everything needed to price one variant, as read inside the checkout transaction. */
export interface PricingVariant {
  id: string;
  productId: string;
  title: string;
  variantLabel: string;
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

/** Allowed status moves. Dashboard and Worker both check against this. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
