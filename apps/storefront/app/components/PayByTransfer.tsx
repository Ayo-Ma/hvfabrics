import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { formatMoney } from "@hv/core";
import { CheckIcon, CopyIcon, WhatsappIcon } from "@hv/ui";
import type { PublicOrder } from "~/lib/api.server";
import { SHOP } from "~/lib/shop";

/**
 * The order is placed and held; the customer pays into the shop's account, then sends the receipt on
 * WhatsApp. WhatsApp is for the receipt only: every question is answered on the site.
 */
export function PayByTransfer({ order }: { order: PublicOrder & { payTo: NonNullable<PublicOrder["payTo"]> } }) {
  const amount = formatMoney(order.totals.total);
  const message = `Hello Harries Vogue, here is my transfer receipt for order ${order.number} (${amount}).`;
  const whatsapp = `${SHOP.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <div className="grid gap-10 md:grid-cols-12 md:gap-x-12 md:gap-y-0">
        <div className="md:col-span-6 md:row-start-1">
          <p className="text-[15px] font-medium uppercase tracking-[0.08em] text-grey-600">
            Order <span className="tabular">{order.number}</span>
          </p>
          <h1 className="display-size cover-fade mt-3">Your fabric is held for you</h1>
          <p className="mt-5 max-w-[46ch] text-lg">
            Nobody else can buy it until <HoldTime iso={order.holdUntil} />. Transfer the amount below, then send us the receipt.
          </p>
        </div>

        <aside className="md:col-span-5 md:col-start-8 md:row-span-2 md:row-start-1" aria-labelledby="payto-title">
          <div className="md:sticky md:top-24">
            <PayToSlip order={order} />
          </div>
        </aside>

        <div className="md:col-span-6 md:row-start-2">
          <ol className="space-y-10 md:mt-10">
            <li className="transfer-step">
              <span className="transfer-num" aria-hidden="true">1</span>
              <div>
                <h2 className="text-xl font-bold">Transfer {amount}</h2>
                <p className="mt-1 text-base text-grey-600">From any bank app. Put your order number in the narration so we can match it.</p>
              </div>
            </li>
            <li className="transfer-step">
              <span className="transfer-num" aria-hidden="true">2</span>
              <div>
                <h2 className="text-xl font-bold">Send the receipt on WhatsApp</h2>
                <p className="mt-1 text-base text-grey-600">A screenshot is fine. The message is written for you; just attach it.</p>
                <a href={whatsapp} target="_blank" rel="noopener" className="transfer-wa mt-5">
                  <WhatsappIcon size={20} /> Send my receipt
                </a>
              </div>
            </li>
            <li className="transfer-step">
              <span className="transfer-num" aria-hidden="true">3</span>
              <div>
                <h2 className="text-xl font-bold">We confirm, then cut</h2>
                <p className="mt-1 text-base text-grey-600">
                  We check every payment ourselves during shop hours, {SHOP.hours}. This page turns to &ldquo;Order confirmed&rdquo; once it&rsquo;s in. Keep
                  this page, or{" "}
                  <Link to="/track" className="underline underline-offset-4">
                    track your order
                  </Link>{" "}
                  with its number and your email.
                </p>
              </div>
            </li>
          </ol>

          <div className="transfer-note mt-12">
            <p className="font-semibold">WhatsApp is for receipts only.</p>
            <p className="mt-1">
              Questions about fabric, delivery or returns are answered here:{" "}
              <Link to="/#questions" className="underline underline-offset-4">
                common questions
              </Link>
              ,{" "}
              <Link to="/policies/delivery" className="underline underline-offset-4">
                delivery
              </Link>{" "}
              and{" "}
              <Link to="/policies/returns" className="underline underline-offset-4">
                returns
              </Link>
              .
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

/** The account to pay into, with copy buttons. Also shown on Track an order while the transfer is awaited. */
export function PayToSlip({ order }: { order: PublicOrder & { payTo: NonNullable<PublicOrder["payTo"]> } }) {
  const amount = formatMoney(order.totals.total);
  return (
    <div className="checkout-slip-field">
      <div className="slip bg-paper px-6 pb-12 pt-7 text-base">
        <h2 id="payto-title" className="text-[15px] text-grey-600">
          Pay into
        </h2>
        <dl className="mt-3">
          <Row label="Amount" value={amount} copy={String(order.totals.total.amount / 100)} big />
          <Row label="Bank" value={order.payTo.bank} />
          <Row label="Account name" value={order.payTo.accountName} />
          <Row label="Account number" value={order.payTo.accountNumber} copy={order.payTo.accountNumber} big />
          <Row label="Narration" value={order.number} copy={order.number} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value, copy, big }: { label: string; value: string; copy?: string; big?: boolean }) {
  return (
    <div className="border-b border-grey-200 py-3 last:border-0">
      <dt className="text-[13px] font-medium uppercase tracking-[0.08em] text-grey-600">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-3">
        <span className={big ? "tabular text-2xl font-bold" : "text-lg font-medium"}>{value}</span>
        {copy ? <CopyButton text={copy} label={label} /> : null}
      </dd>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className="copy-chip"
      data-done={done || undefined}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setDone(true), () => undefined);
      }}
    >
      {done ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
      <span className="sr-only"> {label.toLowerCase()}</span>
    </button>
  );
}

const noSubscribe = () => () => undefined;

/** Shown in the viewer's own time zone; the server render shows the Lagos time until the browser takes over. */
function HoldTime({ iso }: { iso: string | undefined }) {
  const fmt = (tz?: string) =>
    iso
      ? new Intl.DateTimeFormat("en-NG", { weekday: "long", hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {}) }).format(new Date(iso))
      : "tomorrow";
  const text = useSyncExternalStore(noSubscribe, () => fmt(), () => fmt("Africa/Lagos"));
  return (
    <time dateTime={iso} className="font-semibold">
      {text}
    </time>
  );
}
