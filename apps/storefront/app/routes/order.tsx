import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import orderSuccess from "@hv/ui/illustrations/order-success.webp";
import paymentFailed from "@hv/ui/illustrations/payment-failed.webp";
import type { Route } from "./+types/order";
import { apiConnected, lookupOrder, type PublicOrder } from "~/lib/api.server";
import { useBag } from "~/lib/bag";
import { StateMessage } from "~/components/StateMessage";
import { ButtonLink } from "~/components/Button";
import { OrderDetails } from "~/components/OrderDetails";
import { PayByTransfer } from "~/components/PayByTransfer";

/**
 * Paystack returns here: /order/<number>?reference=<ref>. The API confirms payment server-side.
 * Transfer orders land here straight from checkout and show the account to pay into.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const reference = new URL(request.url).searchParams.get("reference");
  if (!apiConnected(env) || !reference) return { state: "unavailable" as const, number: params.number };
  // One quiet retry: a passing hiccup must never take the account details off the customer's screen.
  const order = await lookupOrder(env, params.number, { reference }).catch(async () => {
    await new Promise((r) => setTimeout(r, 400));
    return lookupOrder(env, params.number, { reference }).catch(() => undefined);
  });
  if (order === undefined) return { state: "retry" as const, number: params.number, reference };
  if (!order) return { state: "missing" as const, number: params.number };
  return { state: "found" as const, number: params.number, reference, order };
}

/* ---------- the transfer details, kept on the customer's phone ---------- */

type TransferOrder = PublicOrder & { payTo: NonNullable<PublicOrder["payTo"]> };
const savedKey = (n: string) => `hv-transfer:${n.toUpperCase()}`;

function saveTransfer(order: TransferOrder) {
  try {
    localStorage.setItem(savedKey(order.number), JSON.stringify(order));
  } catch {
    /* private mode: the page still works, it just can't remember */
  }
}
function forgetTransfer(number: string) {
  try {
    localStorage.removeItem(savedKey(number));
  } catch {
    /* ignore */
  }
}
function readRaw(number: string | undefined): string | null {
  if (!number) return null;
  try {
    return localStorage.getItem(savedKey(number));
  } catch {
    return null;
  }
}
function parseTransfer(raw: string | null | undefined): TransferOrder | null | undefined {
  if (raw === undefined) return undefined;
  try {
    const o = raw ? (JSON.parse(raw) as TransferOrder) : null;
    return o?.payTo?.accountNumber ? o : null;
  } catch {
    return null;
  }
}

const noSubscribe = () => () => undefined;

/** The saved details. Undefined during the server render (the server can't see the phone's storage). */
function useSavedTransfer(number: string | undefined) {
  const raw = useSyncExternalStore(
    noSubscribe,
    () => readRaw(number),
    () => undefined,
  );
  return useMemo(() => parseTransfer(raw), [raw]);
}

/**
 * Watches the order without ever breaking the page. It never reloads the page's data (one failed
 * reload on a weak signal used to swap the account details for an error page): it fetches the order
 * itself, ignores failures, pauses while the tab is hidden (the customer is in their bank app) and
 * checks again the moment they come back. A changed order is handed to `onOrder`.
 */
function useOrderWatch(
  number: string,
  reference: string | undefined,
  current: string | undefined,
  every: number,
  onOrder: (o: PublicOrder) => void,
): () => void {
  const checkNow = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!reference || (current !== undefined && current !== "pending")) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        try {
          const res = await fetch(`/order/${encodeURIComponent(number)}/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });
          const body = res.ok ? ((await res.json()) as { order: PublicOrder | null }) : null;
          if (!stopped && body?.order && body.order.status !== current) {
            onOrder(body.order);
            return;
          }
        } catch {
          /* offline or a blip: ask again next time */
        }
      }
      if (!stopped) timer = setTimeout(() => void check(), every);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    checkNow.current = () => void check();
    timer = setTimeout(() => void check(), current === undefined ? 1_500 : every);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [number, reference, current, every, onOrder]);
  return useCallback(() => checkNow.current(), []);
}

export function meta() {
  return [{ title: "Your order · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export default function OrderPage({ loaderData }: Route.ComponentProps) {
  const bag = useBag();
  // The newest copy of the order: from the page load, or from a later check.
  const [live, setLive] = useState<PublicOrder | undefined>(undefined);
  const found = live ?? (loaderData.state === "found" ? loaderData.order : undefined);
  const paid = !!found && found.status !== "pending" && found.status !== "cancelled";
  const pending = found?.status === "pending";
  const transfer = found?.payment === "transfer";
  const saved = useSavedTransfer(loaderData.state === "retry" ? loaderData.number : undefined);

  // Clear the bag once payment is confirmed, or once a transfer order is placed (it's held for them).
  useEffect(() => {
    if ((paid || (pending && transfer)) && bag.ready) bag.clear();
  }, [paid, pending, transfer, bag.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the account details on the phone while the order waits; forget them once it's settled.
  useEffect(() => {
    if (!found) return;
    if (pending && transfer && found.payTo) saveTransfer({ ...found, payTo: found.payTo });
    else if (!pending) forgetTransfer(found.number);
  }, [found, pending, transfer]);

  const reference = loaderData.state === "found" || loaderData.state === "retry" ? loaderData.reference : undefined;
  // Card: Paystack's confirmation lands within seconds. Transfer: the owner checks her account by hand.
  // Not loaded yet (a hiccup on arrival): try again soon.
  const every = !found ? 15_000 : transfer ? 45_000 : 4_000;
  const checkNow = useOrderWatch(loaderData.number, reference, found?.status, every, setLive);

  if (loaderData.state === "retry" && !found) {
    if (saved) return <PayByTransfer order={saved} />;
    if (saved === undefined) return null;
    return <OrderPaused number={loaderData.number} onRetry={checkNow} />;
  }

  if (found && pending && transfer && found.payTo) {
    return <PayByTransfer order={{ ...found, payTo: found.payTo }} />;
  }

  if (found && paid) {
    return (
      <div className="px-(--spacing-gutter) pb-24">
        <StateMessage illustration={orderSuccess} title="Order confirmed">
          {transfer
            ? "Thank you. Your payment is in and we're getting your order ready."
            : "Thank you. We've emailed your receipt and we're packing your order now."}
        </StateMessage>
        <OrderDetails order={found} />
      </div>
    );
  }
  if (pending) {
    return (
      <StateMessage illustration={orderSuccess} title="Confirming your payment…">
        This usually takes a few seconds. Please keep this page open.
      </StateMessage>
    );
  }
  if (loaderData.state === "found" && loaderData.order.status === "cancelled" && transfer) {
    return (
      <StateMessage
        illustration={paymentFailed}
        title="This order was cancelled"
        action={<ButtonLink to="/checkout">Order again</ButtonLink>}
      >
        We didn't receive the transfer within 24 hours, so the items went back on sale. If you did pay, send your receipt on WhatsApp
        with the order number {loaderData.number} and we'll put it right.
      </StateMessage>
    );
  }
  if (loaderData.state === "found" && loaderData.order.status === "cancelled") {
    return (
      <StateMessage
        illustration={paymentFailed}
        title="Payment didn't go through"
        action={<ButtonLink to="/checkout">Try again</ButtonLink>}
      >
        Nothing was charged. Your bag is still saved.
      </StateMessage>
    );
  }
  return (
    <StateMessage
      illustration={paymentFailed}
      title="We can't show this order yet"
      action={<ButtonLink to="/track" variant="ink">Track an order</ButtonLink>}
    >
      {loaderData.state === "unavailable"
        ? "Order lookups aren't connected in this preview."
        : `We couldn't find order ${loaderData.number}. Check the link in your email.`}
    </StateMessage>
  );
}

/** Couldn't reach the order this second and nothing saved on this phone: calm words, not an error page. */
function OrderPaused({ number, onRetry }: { number: string; onRetry: () => void }) {
  return (
    <StateMessage
      illustration={orderSuccess}
      title="Your order is safe"
      action={
        <button type="button" className="quick-add" onClick={onRetry}>
          Show my payment details
        </button>
      }
    >
      Order {number} is placed and held for you. We couldn&rsquo;t load its details this second; this page tries again by itself.
    </StateMessage>
  );
}

/** Anything unexpected on this page still leaves the customer with the account to pay into. */
export function ErrorBoundary() {
  const { number } = useParams();
  const saved = useSavedTransfer(number);
  if (saved) return <PayByTransfer order={saved} />;
  if (saved === undefined) return null;
  return (
    <StateMessage
      illustration={orderSuccess}
      title="Your order is safe"
      action={
        <button type="button" className="quick-add" onClick={() => window.location.reload()}>
          Show my payment details
        </button>
      }
    >
      {number ? `Order ${number} is placed and held for you. ` : ""}Tap below to load it again, or track it with its number and your email.
    </StateMessage>
  );
}
