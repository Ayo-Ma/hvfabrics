import { useEffect, useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { add, BagLineSchema, CheckoutInputSchema, formatMoney, multiply, unitLabel } from "@hv/core";
import { LockIcon } from "@hv/ui";
import emptyBag from "@hv/ui/illustrations/empty-bag.webp";
import paymentFailed from "@hv/ui/illustrations/payment-failed.webp";
import { z } from "zod";
import type { Route } from "./+types/checkout";
import { getSettings } from "~/lib/catalogue.server";
import { startCheckout } from "~/lib/api.server";
import { useBag } from "~/lib/bag";
import { Button, ButtonLink } from "~/components/Button";
import { StateMessage } from "~/components/StateMessage";
import { SHOP, SHOP_CITIES, feeLabel } from "~/lib/shop";

export function meta() {
  return [{ title: "Checkout · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const settings = await getSettings(context.cloudflare.env);
  return { zones: settings.deliveryZones, transfer: settings.payment === "transfer" };
}

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "zoneId" | "address" | "city" | "state" | "items", string>>;

export async function action({ request, context }: Route.ActionArgs) {
  // A request with no form body (bots, a broken client) gets the normal "check your details" answer, not a crash.
  const form = await request.formData().catch(() => new FormData());
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    rawItems = [];
  }
  const items = z.array(BagLineSchema).safeParse(rawItems);
  const parsed = CheckoutInputSchema.safeParse({
    items: items.success ? items.data : [],
    customer: { name: form.get("name"), email: form.get("email"), phone: form.get("phone") },
    delivery: {
      zoneId: form.get("zoneId"),
      address: form.get("address"),
      city: form.get("city"),
      state: form.get("state"),
    },
    source: "storefront",
    // A real tick only: absent, or anything but "yes", means no consent.
    ...(form.get("offers") === "yes" ? { marketingOptIn: true } : {}),
  });

  if (!parsed.success) {
    const errors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[issue.path.length - 1];
      const field = issue.path[0] === "items" ? "items" : (key as keyof FieldErrors);
      errors[field] ??= MESSAGES[field] ?? issue.message;
    }
    return { errors, message: null };
  }

  // The API appends "/<order number>"; Paystack then appends ?reference=… on return.
  const callbackBase = new URL("/order", request.url).toString();
  const result = await startCheckout(context.cloudflare.env, parsed.data, callbackBase, request);
  if (result.ok) throw redirect(result.authorizationUrl);
  if (result.kind === "stock") {
    return { errors: {}, message: "We can't supply everything in your bag right now.", problems: result.problems };
  }
  return { errors: {}, message: result.message };
}

const MESSAGES: FieldErrors = {
  name: "Enter your full name.",
  email: "Enter an email address like name@example.com.",
  phone: "Enter a phone number like 0803 123 4567 or +44 7700 900123.",
  zoneId: "Choose where we should deliver.",
  address: "Enter the street address.",
  city: "Enter the town or city.",
  state: "Enter the state.",
  items: "Your bag is empty.",
};

export default function Checkout({ loaderData, actionData }: Route.ComponentProps) {
  const bag = useBag();
  const nav = useNavigation();
  const submitting = nav.state !== "idle" && nav.formMethod === "POST";
  const [zoneId, setZoneId] = useState(loaderData.zones[0]?.id ?? "");
  const zone = loaderData.zones.find((z) => z.id === zoneId);
  const errors: FieldErrors = actionData?.errors ?? {};

  // The server found stock problems: bring the bag in line with what can really be bought.
  const problems = actionData && "problems" in actionData ? actionData.problems : undefined;
  useEffect(() => {
    for (const p of problems ?? []) {
      // Too many asked for: leave it in the bag and name it below, without saying how many we have.
      if (p.kind !== "insufficient") bag.remove(p.variantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems]);

  const tooMany = bag.items.filter((i) => problems?.some((p) => p.kind === "insufficient" && p.variantId === i.variantId));

  if (bag.ready && bag.items.length === 0) {
    return (
      <StateMessage
        illustration={emptyBag}
        title="Your bag is empty"
        action={<ButtonLink to="/fabrics" variant="ink">Shop fabrics</ButtonLink>}
      >
        Add something to your bag to check out.
      </StateMessage>
    );
  }

  const total = zone ? add(bag.subtotal, zone.fee) : bag.subtotal;
  const PICKUP_STATE: Record<string, string> = { ilorin: "Kwara", abeokuta: "Ogun" };
  const pickupShop = zone?.id.startsWith("pickup")
    ? (() => {
        const shop = SHOP.shops.find((sh) => zone.id === `pickup-${sh.id}`);
        return shop ? { ...shop, state: PICKUP_STATE[shop.id] ?? shop.city } : null;
      })()
    : null;
  const lines = JSON.stringify(bag.items.map((i) => ({ variantId: i.variantId, qty: i.qty })));

  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <h1 className="display-size cover-fade">Checkout</h1>
      <p className="mt-4 text-lg">
        {loaderData.transfer
          ? "No account needed. You pay by bank transfer: the account details come on the next page."
          : "No account needed. You\u2019ll pay on Paystack\u2019s secure page."}
      </p>

      {actionData?.message && (
        <div role="alert" className="mt-8 flex items-center gap-4 bg-grey-100 p-4">
          <img src={paymentFailed} alt="" width={64} height={64} className="size-16 shrink-0" />
          <div>
            <p className="text-base font-medium">{actionData.message}</p>
            {tooMany.length > 0 && (
              <p className="mt-1 text-base">
                Please lower the quantity of {tooMany.map((i) => `${i.title} (${i.variantLabel})`).join(", ")} in your bag and try again.
              </p>
            )}
          </div>
        </div>
      )}

      <Form method="post" className="mt-10 grid gap-12 md:grid-cols-12" noValidate>
        <input type="hidden" name="items" value={lines} />
        <div className="space-y-12 md:col-span-7">
          <fieldset>
            <legend className="checkout-legend">Your details</legend>
            <div className="mt-6 grid gap-5">
              <Field label="Full name" name="name" autoComplete="name" error={errors.name} />
              <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} hint="We'll send your receipt here." />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} hint="For the delivery rider." />
            </div>
          </fieldset>

          <fieldset>
            <legend className="checkout-legend">Collect or deliver</legend>
            <div className="mt-6 grid gap-6" role="radiogroup" aria-label="Collect or deliver" aria-describedby={errors.zoneId ? "zoneId-error" : undefined}>
              {[
                { title: "Collect free from a shop", list: loaderData.zones.filter((z) => z.id.startsWith("pickup")) },
                { title: "Deliver to", list: loaderData.zones.filter((z) => !z.id.startsWith("pickup")) },
              ]
                .filter((g) => g.list.length)
                .map((g) => (
                  <div key={g.title}>
                    <p className="text-[15px] font-semibold">{g.title}</p>
                    <div className="zone-grid mt-3">
                      {g.list.map((z) => (
                        <label key={z.id} className="zone-tile">
                          <input type="radio" name="zoneId" value={z.id} checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="sr-only" />
                          <span className="zone-name">{z.id.startsWith("pickup") ? z.name.replace("Collect from our ", "").replace(" shop", "") : z.name}</span>
                          <span className="zone-fee tabular">{feeLabel(z)}</span>
                          {z.eta && !z.eta.startsWith("[TBC") ? <span className="zone-eta">{z.eta}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              {errors.zoneId && <p id="zoneId-error" className="text-[15px] font-medium text-danger">{errors.zoneId}</p>}
            </div>
            {pickupShop ? (
              <div className="collect-note mt-6">
                <input type="hidden" name="address" value={`Collect from ${pickupShop.address}`} />
                <input type="hidden" name="city" value={pickupShop.city} />
                <input type="hidden" name="state" value={pickupShop.state} />
                <p className="font-medium">Collect from {pickupShop.address}</p>
                <p className="mt-1 text-grey-600">Open {SHOP.hours}. We&rsquo;ll message you on WhatsApp when it&rsquo;s ready.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                <Field label="Street address" name="address" autoComplete="street-address" error={errors.address} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Town or city" name="city" autoComplete="address-level2" error={errors.city} />
                  <Field label="State" name="state" autoComplete="address-level1" error={errors.state} />
                </div>
              </div>
            )}
          </fieldset>
          <label className="offers-check mt-8 flex cursor-pointer items-start gap-3 text-[15px]">
            <input type="checkbox" name="offers" value="yes" className="peer sr-only" />
            <span aria-hidden="true" className="offers-box" />
            <span>
              <span className="font-semibold">Send me offers from Harries Vogue</span>
              <span className="mt-0.5 block text-grey-600">New fabrics and offers on WhatsApp and email. Stop any time.</span>
            </span>
          </label>
        </div>

        <aside className="md:col-span-5" aria-labelledby="summary-title">
          <div className="md:sticky md:top-24">
            <div className="checkout-slip-field">
              <div className="slip bg-paper px-6 pb-12 pt-7 text-base">
                <p className="text-[15px] text-grey-600">Harries Vogue · {SHOP_CITIES}</p>
                <h2 id="summary-title" className="mt-4 text-lg font-bold">Your order</h2>
                <ul className="mt-2">
                  {bag.items.map((i) => (
                    <li key={i.variantId} className="slip-row">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{i.title}</span>
                        <span className="block text-[15px] text-grey-600">
                          {i.variantLabel} · {i.qty} {unitLabel(i.unit, i.qty)}
                        </span>
                      </span>
                      <i />
                      <span className="tabular">{formatMoney(multiply(i.unitPrice, i.qty))}</span>
                    </li>
                  ))}
                </ul>
                <p className="slip-row mt-5"><span>Subtotal</span><i /><span className="tabular">{formatMoney(bag.subtotal)}</span></p>
                <p className="slip-row"><span>{zone?.id.startsWith("pickup") ? "Collection" : "Delivery"}</span><i /><span key={zone?.id ?? "none"} className="tabular tick">{!zone ? "Choose above" : feeLabel(zone)}</span></p>
                <p className="mt-6 flex items-center justify-between gap-4 bg-ink px-4 py-3 text-lg font-bold text-paper">
                  <span>Total</span>
                  <span key={total.amount} className="tabular tick">{formatMoney(total)}</span>
                </p>
              </div>
            </div>
            <Button type="submit" className="mt-6 min-h-14 w-full" disabled={submitting || !bag.ready}>
              <LockIcon />{" "}
              {loaderData.transfer
                ? submitting
                  ? "Placing your order…"
                  : `Place order · ${formatMoney(total)}`
                : submitting
                  ? "Starting secure payment…"
                  : `Pay ${formatMoney(total)}`}
            </Button>
            <p className="mt-3 text-[15px] text-grey-600">
              {loaderData.transfer
                ? "Next you'll see our account details. Your items are held for 24 hours while you transfer. Prices and stock are confirmed when you place the order."
                : "Your items are held for 15 minutes while you pay. Prices and stock are confirmed when you press Pay."}{" "}
              <Link to="/policies/returns" className="underline underline-offset-4">
                Returns
              </Link>
            </p>
          </div>
        </aside>
      </Form>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  ...input
}: { label: string; name: string; error?: string | undefined; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={name} className="text-[15px] font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="text-[13px] text-grey-600">
          {hint}
        </p>
      )}
      <input
        id={name}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="mt-2 block min-h-12 w-full bg-grey-100 px-4 text-base outline-offset-0 aria-invalid:outline-2 aria-invalid:outline-danger"
        {...input}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
