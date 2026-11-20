import {
  CheckoutInputSchema,
  newOrderNumber,
  priceOrder,
  MinimumQuantityError,
  reservationExpiry,
  transferHoldExpiry,
  variantLabel,
  type BankTransfer,
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
import { orderPaidPush, transferWaitingPush } from "./push";

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
  const transfer = deps.paymentMode === "transfer";
  if (!transfer && !deps.paystack) {
    return { kind: "unavailable", message: "Payments aren't configured yet (Paystack keys missing)." };
  }
  const settings = await deps.store.getSettings();
  if (transfer && !settings.bankTransfer) {
    return { kind: "unavailable", message: "We can't take orders online right now. Please try again later." };
  }
  const zone = settings.deliveryZones.find((z) => z.id === req.delivery.zoneId);
  if (!zone) return { kind: "invalid", message: "Choose a delivery area." };

  const lines = mergeLines(req.items);
  const number = await uniqueOrderNumber(deps);
  const now = deps.now();

  let created: Awaited<ReturnType<typeof deps.store.createPendingOrder>>;
  try {
  created = await deps.store.createPendingOrder(lines, (found) => {
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
          unit: f.variant.options.unit,
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
      ...(transfer ? { payment: "transfer" as const } : {}),
      paystackRef: id,
      reservedUntil: (transfer ? transferHoldExpiry(now) : reservationExpiry(now)).toISOString(),
      ...(geo.country ? { country: geo.country } : {}),
      ...(geo.city ? { city: geo.city } : {}),
      ...(req.source ? { source: req.source } : {}),
      ...(req.marketingOptIn ? { marketingOptIn: true } : {}),
      createdAt: now.toISOString(),
    };
    return order;
  });
  } catch (e) {
    if (e instanceof MinimumQuantityError) return { kind: "invalid", message: `${e.title} is cut from ${e.min} yards. Please choose at least ${e.min}.` };
    throw e;
  }

  if (!created.ok) return { kind: "stock", problems: created.problems };
  const order = created.order;
  rebuildLater(deps, "reservation");

  if (transfer) {
    // No payment page: the customer goes straight to the order page with the account to pay into.
    deps.events?.writeDataPoint({ blobs: ["checkout_start", order.number, geo.country ?? ""], doubles: [order.totals.total.amount], indexes: ["checkout_start"] });
    deps.waitUntil(alertTransferWaiting(deps, order).catch((e: unknown) => deps.log("transfer alert failed", { order: order.number, error: String(e) })));
    const page = `${req.callbackBase.replace(/\/$/, "")}/${order.number}?reference=${encodeURIComponent(order.paystackRef!)}`;
    return { kind: "ok", orderNumber: order.number, authorizationUrl: page };
  }
  if (!deps.paystack) return { kind: "unavailable", message: "Payments aren't configured yet (Paystack keys missing)." };

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
  // Transfers are confirmed by the owner in the dashboard (confirmTransfer), never by Paystack.
  if (order.payment === "transfer") return order;
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

  return recordPayment(deps, order.id, tx.paid_at ?? deps.now().toISOString());
}

export type TransferOutcome =
  | { ok: true; order: Order }
  | { ok: false; status: 404 | 409; message: string };

/**
 * The owner saw the money arrive in the shop's account: mark the transfer order paid. Same path as a
 * Paystack payment from here (stock, customer record, alerts), so a late confirmation after the
 * hold ran out still takes the stock if it's there, or flags the order if it isn't.
 */
export async function confirmTransfer(deps: Deps, orderId: string): Promise<TransferOutcome> {
  const order = await deps.store.getOrder(orderId);
  if (!order) return { ok: false, status: 404, message: "Not found" };
  if (order.payment !== "transfer") return { ok: false, status: 409, message: "This order was paid by card; Paystack confirms it." };
  if (order.refund) return { ok: false, status: 409, message: "This order was refunded." };
  if (order.status !== "pending" && order.status !== "cancelled") return { ok: true, order };
  const paid = await recordPayment(deps, order.id, deps.now().toISOString());
  return paid ? { ok: true, order: paid } : { ok: false, status: 404, message: "Not found" };
}

/** The money never came: release the held items. */
export async function cancelTransfer(deps: Deps, orderId: string): Promise<TransferOutcome> {
  const order = await deps.store.getOrder(orderId);
  if (!order) return { ok: false, status: 404, message: "Not found" };
  if (order.payment !== "transfer" || order.status !== "pending") {
    return { ok: false, status: 409, message: "Only transfer orders still waiting for payment can be cancelled here." };
  }
  const cancelled = await deps.store.cancelPending(order.id, deps.now().toISOString());
  if (!cancelled) return { ok: false, status: 404, message: "Not found" };
  rebuildLater(deps, "transfer cancelled");
  return { ok: true, order: cancelled };
}

async function recordPayment(deps: Deps, orderId: string, paidAt: string): Promise<Order | null> {
  const result = await deps.store.markPaid(orderId, paidAt);
  if (!result) return null;
  if (result.changed) {
    rebuildLater(deps, "paid");
    const paid = result.order;
    deps.events?.writeDataPoint({ blobs: ["purchase", paid.number, paid.country ?? "", paid.city ?? ""], doubles: [paid.totals.total.amount], indexes: ["purchase"] });
    deps.waitUntil(alertOwner(deps, paid).catch((e: unknown) => deps.log("order alert failed", { order: paid.number, error: String(e) })));
  }
  return result.order;
}

export interface PublicOrder {
  number: string;
  status: OrderStatus;
  payment: "card" | "transfer";
  createdAt: string;
  paidAt?: string;
  /** Transfer orders still waiting: when the hold ends, and the account to pay into. */
  holdUntil?: string;
  payTo?: BankTransfer;
  items: { title: string; variantLabel: string; qty: number; unitPrice: Money }[];
  totals: Order["totals"];
  deliveryZone: string;
}

/** What a shopper may see about their order: no address, phone or payment reference. */
export function toPublicOrder(o: Order, payTo?: BankTransfer): PublicOrder {
  const waiting = o.payment === "transfer" && o.status === "pending";
  return {
    number: o.number,
    status: o.status,
    payment: o.payment ?? "card",
    createdAt: o.createdAt,
    ...(o.paidAt ? { paidAt: o.paidAt } : {}),
    ...(waiting && o.reservedUntil ? { holdUntil: o.reservedUntil } : {}),
    ...(waiting && payTo ? { payTo } : {}),
    items: o.items.map((i) => ({ title: i.title, variantLabel: i.variantLabel, qty: i.qty, unitPrice: i.unitPrice })),
    totals: o.totals,
    deliveryZone: o.delivery.zone,
  };
}

/**
 * PLAN.md step 5: push to her phone and email her and the customer. Push goes first and
 * doesn't wait for email. Devices that unsubscribed are dropped from the list.
 */
/** A transfer order was placed: tell her phone to watch for the money (and the receipt on WhatsApp). */
async function alertTransferWaiting(deps: Deps, order: Order): Promise<void> {
  if (!deps.push) return;
  const settings = await deps.store.getSettings();
  const r = await deps.push.send(settings.notificationTargets.pushTokens, transferWaitingPush(order));
  if (r.dead.length) await deps.store.removePushTokens(r.dead);
}

export async function alertOwner(deps: Deps, order: Order): Promise<void> {
  const settings = await deps.store.getSettings();
  const push = deps.push
    ? deps.push.send(settings.notificationTargets.pushTokens, orderPaidPush(order)).then(async (r) => {
        if (r.dead.length) await deps.store.removePushTokens(r.dead);
      })
    : Promise.resolve();
  const results = await Promise.allSettled([push, deps.notify.orderPaid(order, settings)]);
  const failed = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
  if (failed.length) throw new Error(failed.join("; "));
}
