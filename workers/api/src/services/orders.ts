import {
  CheckoutInputSchema,
  newOrderNumber,
  priceOrder,
  reservationExpiry,
  variantLabel,
  type BagLine,
  type BagProblem,
  type Money,
  type Order,
  type OrderStatus,
  type PricingVariant,
} from "@hv/core";
import { z } from "zod";
import type { Deps } from "../deps";
import { rebuildLater } from "./catalogue";

export const CheckoutRequestSchema = CheckoutInputSchema.extend({ callbackBase: z.url() });
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export type CheckoutOutcome =
  | { kind: "ok"; orderNumber: string; authorizationUrl: string }
  | { kind: "stock"; problems: BagProblem[] }
  | { kind: "invalid"; message: string }
  | { kind: "unavailable"; message: string };

function mergeLines(lines: BagLine[]): BagLine[] {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.variantId, (m.get(l.variantId) ?? 0) + l.qty);
  return [...m].map(([variantId, qty]) => ({ variantId, qty }));
}

async function uniqueOrderNumber(deps: Deps): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const n = newOrderNumber();
    if (!(await deps.store.getOrderByNumber(n))) return n;
  }
  throw new Error("Could not allocate an order number");
}

/** PLAN.md checkout steps 1–2: validate against live stock, hold for 15 minutes, start Paystack. */
export async function startCheckout(
  deps: Deps,
  req: CheckoutRequest,
  geo: { country?: string; city?: string },
): Promise<CheckoutOutcome> {
  if (new URL(req.callbackBase).origin !== deps.storefrontOrigin) {
    return { kind: "invalid", message: "Unknown storefront" };
  }
  if (!deps.paystack) {
    return { kind: "unavailable", message: "Payments aren't configured yet (Paystack keys missing)." };
  }
  const settings = await deps.store.getSettings();
  const zone = settings.deliveryZones.find((z) => z.id === req.delivery.zoneId);
  if (!zone) return { kind: "invalid", message: "Choose a delivery area." };

  const lines = mergeLines(req.items);
  const number = await uniqueOrderNumber(deps);
  const now = deps.now();

  const created = await deps.store.createPendingOrder(lines, (found) => {
    const pricing = new Map<string, PricingVariant>(
      [...found].map(([id, f]) => [
        id,
        {
          id,
          productId: f.productId,
          title: f.productTitle,
          variantLabel: variantLabel({
            ...(f.variant.options.colour ? { colour: f.variant.options.colour } : {}),
            ...(f.variant.options.size ? { size: f.variant.options.size } : {}),
            unit: f.variant.options.unit,
          }),
          price: f.variant.price,
        },
      ]),
    );
    const priced = priceOrder(lines, pricing, zone);
    const id = crypto.randomUUID();
    const order: Order = {
      id,
      number,
      customer: req.customer,
      items: priced.items,
      delivery: {
        zone: zone.name,
        address: `${req.delivery.address}, ${req.delivery.city}, ${req.delivery.state}`,
        fee: zone.fee,
      },
      totals: priced.totals,
      currency: priced.currency,
      status: "pending",
      paystackRef: id,
      reservedUntil: reservationExpiry(now).toISOString(),
      ...(geo.country ? { country: geo.country } : {}),
      ...(geo.city ? { city: geo.city } : {}),
      ...(req.source ? { source: req.source } : {}),
      createdAt: now.toISOString(),
    };
    return order;
  });

  if (!created.ok) return { kind: "stock", problems: created.problems };
  const order = created.order;
  rebuildLater(deps, "reservation");

  try {
    const tx = await deps.paystack.initialize({
      email: order.customer.email,
      amount: order.totals.total.amount,
      currency: order.currency,
      reference: order.paystackRef!,
      callbackUrl: `${req.callbackBase.replace(/\/$/, "")}/${order.number}`,
      metadata: { orderNumber: order.number },
    });
    deps.events?.writeDataPoint({ blobs: ["checkout_start", order.number, geo.country ?? ""], doubles: [order.totals.total.amount], indexes: ["checkout_start"] });
    return { kind: "ok", orderNumber: order.number, authorizationUrl: tx.authorization_url };
  } catch (e) {
    // Couldn't reach Paystack: give the stock back straight away rather than holding it 15 minutes.
    deps.log("paystack initialize failed", { order: order.number, error: String(e) });
    await deps.store.cancelPending(order.id, deps.now().toISOString());
    rebuildLater(deps, "init failed");
    return { kind: "unavailable", message: "We couldn't start the payment. Nothing was charged. Please try again." };
  }
}

/**
 * PLAN.md checkout steps 3–5. Called by the webhook and by the return page (the webhook can
 * arrive after the shopper is redirected back). Always re-verifies with Paystack and checks
 * the amount; marking paid is idempotent, so calling it twice is safe.
 */
export async function confirmPayment(deps: Deps, reference: string): Promise<Order | null> {
  const order = await deps.store.getOrder(reference);
  if (!order) {
    deps.log("payment for unknown order", { reference });
    return null;
  }
  if (order.status !== "pending" && order.status !== "cancelled") return order;
  if (!deps.paystack) return order;

  const tx = await deps.paystack.verify(reference);
  if (tx.status !== "success") return order;
  if (tx.amount !== order.totals.total.amount || tx.currency !== order.currency) {
    deps.log("PAYMENT AMOUNT MISMATCH — not marking paid", {
      order: order.number,
      expected: order.totals.total.amount,
      got: tx.amount,
      currency: tx.currency,
    });
    return order;
  }

  const result = await deps.store.markPaid(order.id, tx.paid_at ?? deps.now().toISOString());
  if (!result) return null;
  if (result.changed) {
    rebuildLater(deps, "paid");
    const paid = result.order;
    deps.events?.writeDataPoint({ blobs: ["purchase", paid.number, paid.country ?? "", paid.city ?? ""], doubles: [paid.totals.total.amount], indexes: ["purchase"] });
    deps.waitUntil(
      deps.store
        .getSettings()
        .then((s) => deps.notify.orderPaid(paid, s))
        .catch((e: unknown) => deps.log("order notification failed", { order: paid.number, error: String(e) })),
    );
  }
  return result.order;
}

export interface PublicOrder {
  number: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  items: { title: string; variantLabel: string; qty: number; unitPrice: Money }[];
  totals: Order["totals"];
  deliveryZone: string;
}

/** What a shopper may see about their order: no address, phone or payment reference. */
export function toPublicOrder(o: Order): PublicOrder {
  return {
    number: o.number,
    status: o.status,
    createdAt: o.createdAt,
    ...(o.paidAt ? { paidAt: o.paidAt } : {}),
    items: o.items.map((i) => ({ title: i.title, variantLabel: i.variantLabel, qty: i.qty, unitPrice: i.unitPrice })),
    totals: o.totals,
    deliveryZone: o.delivery.zone,
  };
}
