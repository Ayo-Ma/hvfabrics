import { Form } from "react-router";
import { TrackOrderInputSchema } from "@hv/core";
import noResults from "@hv/ui/illustrations/no-results.webp";
import type { Route } from "./+types/track";
import { apiConnected, lookupOrder } from "~/lib/api.server";
import { Button } from "~/components/Button";
import { OrderDetails } from "~/components/OrderDetails";
import { StateMessage } from "~/components/StateMessage";

export function meta() {
  return [{ title: "Track an order · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const number = url.searchParams.get("number") ?? "";
  const email = url.searchParams.get("email") ?? "";
  if (!number && !email) return { state: "form" as const, number, email };
  const parsed = TrackOrderInputSchema.safeParse({ number, email });
  if (!parsed.success) return { state: "invalid" as const, number, email };
  if (!apiConnected(context.cloudflare.env)) return { state: "unavailable" as const, number, email };
  const order = await lookupOrder(context.cloudflare.env, parsed.data.number.toUpperCase(), { email: parsed.data.email });
  return order ? { state: "found" as const, number, email, order } : { state: "missing" as const, number, email };
}

export default function Track({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl tracking-(--tracking-display)">Track an order</h1>
        <p className="mt-3 text-lg text-grey-600">Use the order number from your receipt email.</p>
        <Form method="get" className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="number" className="text-[15px] font-medium">
              Order number
            </label>
            <input id="number" name="number" defaultValue={loaderData.number} placeholder="HV-7K3M9Q" autoComplete="off" className="mt-2 block min-h-12 w-full bg-grey-100 px-4 uppercase" />
          </div>
          <div>
            <label htmlFor="email" className="text-[15px] font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" defaultValue={loaderData.email} autoComplete="email" className="mt-2 block min-h-12 w-full bg-grey-100 px-4" />
          </div>
          <Button type="submit" variant="ink">
            Track
          </Button>
        </Form>
        {loaderData.state === "invalid" && (
          <p role="alert" className="mt-4 text-[15px] font-medium text-danger">
            Enter the order number (like HV-7K3M9Q) and the email you used.
          </p>
        )}
      </div>

      <div className="mt-12">
        {loaderData.state === "found" && <OrderDetails order={loaderData.order} />}
        {loaderData.state === "missing" && (
          <StateMessage illustration={noResults} title="No order found" headingLevel={2}>
            Check the number and email match your receipt.
          </StateMessage>
        )}
        {loaderData.state === "unavailable" && (
          <StateMessage illustration={noResults} title="Tracking isn't connected yet" headingLevel={2}>
            Order tracking works once the store's order system is live.
          </StateMessage>
        )}
      </div>
    </div>
  );
}
