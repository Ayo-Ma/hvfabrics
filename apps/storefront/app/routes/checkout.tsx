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
import { ProductImage } from "~/components/ProductImage";
import { feeLabel } from "~/lib/shop";

export function meta() {
  return [{ title: "Checkout · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const settings = await getSettings(context.cloudflare.env);
  return { zones: settings.deliveryZones };
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
  const result = await startCheckout(context.cloudflare.env, parsed.data, callbackBase);
  if (result.ok) throw redirect(result.authorizationUrl);
  if (result.kind === "stock") {
    return { errors: {}, message: "Some items have just sold out or run low. Your bag has been updated; please check it.", problems: result.problems };
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
      if (p.kind === "insufficient") bag.setQty(p.variantId, p.available);
      else bag.remove(p.variantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems]);

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
  const lines = JSON.stringify(bag.items.map((i) => ({ variantId: i.variantId, qty: i.qty })));

  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <h1 className="text-4xl tracking-(--tracking-display)">Checkout</h1>
      <p className="mt-3 text-lg text-grey-600">No account needed. You'll pay on Paystack's secure page.</p>

      {actionData?.message && (
        <div role="alert" className="mt-8 flex items-center gap-4 bg-grey-100 p-4">
          <img src={paymentFailed} alt="" width={64} height={64} className="size-16 shrink-0" />
          <p className="text-base font-medium">{actionData.message}</p>
        </div>
      )}

      <Form method="post" className="mt-10 grid gap-12 md:grid-cols-12" noValidate>
        <input type="hidden" name="items" value={lines} />
        <div className="space-y-12 md:col-span-7">
          <fieldset>
            <legend className="font-display text-2xl font-black tracking-(--tracking-heading)">Your details</legend>
            <div className="mt-6 grid gap-5">
              <Field label="Full name" name="name" autoComplete="name" error={errors.name} />
              <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={errors.email} hint="We'll send your receipt here." />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} hint="For the delivery rider." />
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-2xl font-black tracking-(--tracking-heading)">Delivery</legend>
            <div className="mt-6 grid gap-3" role="radiogroup" aria-describedby={errors.zoneId ? "zoneId-error" : undefined}>
              {loaderData.zones.map((z) => (
                <label
                  key={z.id}
                  className="flex min-h-14 cursor-pointer items-center justify-between gap-4 bg-grey-100 px-4 has-checked:bg-ink has-checked:text-paper"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="zoneId"
                      value={z.id}
                      checked={zoneId === z.id}
                      onChange={() => setZoneId(z.id)}
                      className="size-5 accent-yellow"
                    />
                    <span className="font-medium">{z.name}</span>
                    <span className="text-[15px] opacity-80">{z.eta}</span>
                  </span>
                  <span className="tabular font-semibold">{feeLabel(z)}</span>
                </label>
              ))}
              {errors.zoneId && <p id="zoneId-error" className="text-[15px] font-medium text-danger">{errors.zoneId}</p>}
            </div>
            <div className="mt-6 grid gap-5">
              <Field label="Street address" name="address" autoComplete="street-address" error={errors.address} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Town or city" name="city" autoComplete="address-level2" error={errors.city} />
                <Field label="State" name="state" autoComplete="address-level1" error={errors.state} />
              </div>
            </div>
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
          <div className="bg-grey-50 p-6 md:sticky md:top-24">
            <h2 id="summary-title" className="text-2xl">
              Order summary
            </h2>
            <ul className="mt-6 space-y-4">
              {bag.items.map((i) => (
                <li key={i.variantId} className="grid grid-cols-[56px_1fr_auto] items-center gap-4">
                  <div className="bg-grey-100">
                    {i.image && <ProductImage image={i.image} sizes="56px" className="aspect-[4/5] w-full object-cover" />}
                  </div>
                  <div className="min-w-0 text-[15px]">
                    <p className="truncate font-medium">{i.title}</p>
                    <p className="text-grey-600">
                      {i.variantLabel} · {i.qty} {unitLabel(i.unit, i.qty)}
                    </p>
                  </div>
                  <p className="tabular text-[15px] font-semibold">{formatMoney(multiply(i.unitPrice, i.qty))}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 text-base">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatMoney(bag.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd className="tabular">{!zone ? "—" : feeLabel(zone)}</dd>
              </div>
              <div className="flex justify-between pt-3 text-xl font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{formatMoney(total)}</dd>
              </div>
            </dl>
            <Button type="submit" className="mt-6 w-full" disabled={submitting || !bag.ready}>
              <LockIcon /> {submitting ? "Starting secure payment…" : `Pay ${formatMoney(total)}`}
            </Button>
            <p className="mt-3 text-[13px] text-grey-600">
              Items are held for 15 minutes while you pay. Prices and stock are confirmed when you press Pay.{" "}
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
