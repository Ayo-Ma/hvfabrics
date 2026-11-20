import { useEffect } from "react";
import { useRevalidator } from "react-router";
import orderSuccess from "@hv/ui/illustrations/order-success.webp";
import paymentFailed from "@hv/ui/illustrations/payment-failed.webp";
import type { Route } from "./+types/order";
import { apiConnected, lookupOrder } from "~/lib/api.server";
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
  const order = await lookupOrder(env, params.number, { reference });
  if (!order) return { state: "missing" as const, number: params.number };
  return { state: "found" as const, number: params.number, order };
}

export function meta() {
  return [{ title: "Your order · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export default function OrderPage({ loaderData }: Route.ComponentProps) {
  const bag = useBag();
  const { revalidate } = useRevalidator();
  const paid = loaderData.state === "found" && loaderData.order.status !== "pending" && loaderData.order.status !== "cancelled";
  const pending = loaderData.state === "found" && loaderData.order.status === "pending";
  const transfer = loaderData.state === "found" && loaderData.order.payment === "transfer";

  // Clear the bag once payment is confirmed, or once a transfer order is placed (it's held for them).
  useEffect(() => {
    if ((paid || (pending && transfer)) && bag.ready) bag.clear();
  }, [paid, pending, transfer, bag.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // The webhook may land a few seconds after the redirect: check again while pending.
  // A transfer waits for the owner to check her account, so look less often.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(revalidate, transfer ? 30_000 : 3000);
    return () => clearInterval(t);
  }, [pending, transfer, revalidate]);

  if (loaderData.state === "found" && pending && transfer && loaderData.order.payTo) {
    return <PayByTransfer order={{ ...loaderData.order, payTo: loaderData.order.payTo }} />;
  }

  if (loaderData.state === "found" && paid) {
    return (
      <div className="px-(--spacing-gutter) pb-24">
        <StateMessage illustration={orderSuccess} title="Order confirmed">
          {transfer
            ? "Thank you. Your payment is in and we're getting your order ready."
            : "Thank you. We've emailed your receipt and we're packing your order now."}
        </StateMessage>
        <OrderDetails order={loaderData.order} />
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
