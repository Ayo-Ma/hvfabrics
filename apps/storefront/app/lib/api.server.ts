import { apiFetch } from "./api-fetch.server";
import type { BagProblem, CheckoutInput, Money, OrderStatus } from "@hv/core";

/**
 * Contract with the API Worker (workers/api). The storefront never talks to
 * Firestore or Paystack directly; checkout and order lookups go through here.
 */

export interface PublicOrder {
  number: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  items: { title: string; variantLabel: string; qty: number; unitPrice: Money }[];
  totals: { subtotal: Money; delivery: Money; total: Money };
  deliveryZone: string;
}

export type CheckoutResult =
  | { ok: true; orderNumber: string; authorizationUrl: string }
  | { ok: false; kind: "stock"; problems: BagProblem[] }
  | { ok: false; kind: "invalid"; message: string }
  | { ok: false; kind: "unavailable"; message: string };

export function apiConnected(env: Env): boolean {
  return Boolean(env.API_URL);
}

export async function startCheckout(env: Env, input: CheckoutInput, callbackBase: string): Promise<CheckoutResult> {
  if (!apiConnected(env)) {
    return {
      ok: false,
      kind: "unavailable",
      message: "Payments aren't connected yet. This preview can't take orders until Paystack is set up.",
    };
  }
  const res = await apiFetch(env, "/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, callbackBase }),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && body && typeof body.authorizationUrl === "string" && typeof body.orderNumber === "string") {
    return { ok: true, orderNumber: body.orderNumber, authorizationUrl: body.authorizationUrl };
  }
  if (res.status === 409 && body && Array.isArray(body.problems)) {
    return { ok: false, kind: "stock", problems: body.problems as BagProblem[] };
  }
  if (res.status === 400) {
    return { ok: false, kind: "invalid", message: String(body?.message ?? "Please check your details.") };
  }
  if (res.status === 503 && typeof body?.message === "string") {
    return { ok: false, kind: "unavailable", message: body.message };
  }
  if (res.status === 429) {
    return { ok: false, kind: "unavailable", message: "Too many attempts. Please wait a minute and try again." };
  }
  return { ok: false, kind: "unavailable", message: "We couldn't start the payment. Nothing was charged. Please try again." };
}

export async function lookupOrder(
  env: Env,
  number: string,
  by: { email: string } | { reference: string },
): Promise<PublicOrder | null> {
  if (!apiConnected(env)) return null;
  const qs = new URLSearchParams("email" in by ? { email: by.email } : { reference: by.reference });
  const res = await apiFetch(env, `/orders/${encodeURIComponent(number)}?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Response("Order lookup unavailable", { status: 503 });
  return (await res.json()) as PublicOrder;
}
