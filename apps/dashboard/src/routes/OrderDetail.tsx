import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { BOARD_LABELS, multiply, type OrderStatus } from "@hv/core";
import { ChevronLeftIcon, MailIcon, PhoneIcon, PrintIcon, WhatsappIcon } from "@hv/ui/icons";
import { Button, ErrorLine, PageHeader, Panel, Pill, Skel, showToast } from "../components/ui";
import { ApiError } from "../lib/api";
import { cancelTransfer, confirmTransfer, refundOrder, useOrder, type BoardStatus } from "../lib/data";
import { useMe } from "../lib/auth";
import { dateTime, money, qtyText } from "../lib/format";
import { printOrder } from "../lib/print";
import { FLAG_TEXT, move } from "./Orders";

/** One order: what to pack, where it goes, how to reach the customer, and the two print buttons. */

const NEXT: Partial<Record<OrderStatus, { to: BoardStatus; label: string }>> = {
  paid: { to: "packed", label: "Mark packed" },
  packed: { to: "shipped", label: "Mark sent" },
  shipped: { to: "delivered", label: "Mark delivered" },
};

const TONE: Record<OrderStatus, "neutral" | "pos" | "neg" | "warn" | "ink"> = {
  pending: "neutral",
  paid: "warn",
  packed: "neutral",
  shipped: "neutral",
  delivered: "pos",
  cancelled: "neg",
};

/** wa.me wants the number in international form without "+": 0803… → 234803… */
function whatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `234${digits.slice(1)}` : digits}`;
}

/**
 * Owner only (questionnaire Q63): cancel a paid order and record the refund she sends by bank transfer
 * (Q39). Cut fabric can't go back on the shelf, so restocking is a choice, on by default only before packing.
 */
function RefundDialog({ order, onDone }: { order: NonNullable<ReturnType<typeof useOrder>["data"]>; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [restock, setRestock] = useState(order.status === "paid");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button tone="danger" onClick={() => ref.current?.showModal()}>
        Cancel and refund
      </Button>
      <dialog ref={ref} aria-labelledby="refund-title" className="refund-dialog">
        <form
          method="dialog"
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await refundOrder(order, { restock, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) });
              ref.current?.close();
              onDone();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't cancel the order. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 id="refund-title" className="text-lg font-bold">
            Cancel <span className="num">{order.number}</span> and refund {money(order.totals.total)}?
          </h2>
          <p className="text-sm text-muted">
            Send {money(order.totals.total)} to {order.customer.name} by bank transfer, then confirm here. The order moves to Cancelled and
            stops counting in money in. This can&rsquo;t be undone.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-yellow)]" />
            <span>
              <span className="font-medium">Put the items back in stock</span>
              <span className="block text-muted">Leave unticked if the fabric has already been cut.</span>
            </span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Transfer reference (optional)</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} className="h-10 rounded-[var(--radius-control)] border border-control bg-surface px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="h-10 rounded-[var(--radius-control)] border border-control bg-surface px-3" />
          </label>
          {error ? <p role="alert" className="text-sm text-neg">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => ref.current?.close()}>
              Keep the order
            </Button>
            <Button type="submit" tone="primary" disabled={busy}>
              {busy ? "Cancelling…" : "I've sent the refund"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function OrderDetail() {
  const { id = "" } = useParams();
  const q = useOrder(id);
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const o = q.data;

  const back = (
    <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
      <ChevronLeftIcon size={16} /> Orders
    </Link>
  );

  if (q.error && !o) {
    return (
      <>
        {back}
        <ErrorLine error={q.error} retry={() => void q.refresh()} />
      </>
    );
  }
  if (!o) {
    return (
      <>
        {back}
        <Skel w={220} h={30} />
        <Skel w={320} h={16} className="mt-3" />
        <Skel h={240} className="mt-8" />
      </>
    );
  }

  const next = NEXT[o.status];
  const timeline: [string, string | undefined][] = [
    ["Ordered", o.createdAt],
    ["Paid", o.paidAt],
    ["Packed", o.packedAt],
    ["Sent", o.shippedAt],
    ["Delivered", o.deliveredAt],
  ];

  return (
    <>
      {back}
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="num">{o.number}</span>
            <Pill tone={TONE[o.status]}>{BOARD_LABELS[o.status]}</Pill>
          </span>
        }
        sub={`${o.customer.name} · ${money(o.totals.total)} · paid ${o.paidAt ? dateTime(o.paidAt) : "—"}`}
        actions={
          <>
            <Button onClick={() => void printOrder(o, "slip")}>
              <PrintIcon size={16} /> Slip 80 mm
            </Button>
            <Button onClick={() => void printOrder(o, "a4")}>
              <PrintIcon size={16} /> Invoice A4
            </Button>
            {next ? (
              <Button
                tone="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await move(o, next.to);
                  await q.refresh();
                  setBusy(false);
                }}
              >
                {next.label}
              </Button>
            ) : null}
            {me.can.refunds && (o.status === "paid" || o.status === "packed") ? <RefundDialog order={o} onDone={() => void q.refresh()} /> : null}
            {me.can.payments && o.payment === "transfer" && o.status === "pending" ? (
              <>
                <Button
                  tone="primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await confirmTransfer(o);
                      showToast(`${o.number} is paid. It's in New, ready to pack.`);
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
                    }
                    await q.refresh();
                    setBusy(false);
                  }}
                >
                  Money received
                </Button>
                <Button
                  tone="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Cancel ${o.number}? The held items go back on sale.`)) return;
                    setBusy(true);
                    try {
                      await cancelTransfer(o);
                      showToast(`${o.number} cancelled. Items are back on sale.`);
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
                    }
                    await q.refresh();
                    setBusy(false);
                  }}
                >
                  Not paid
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {o.flags?.length ? (
        <div className="mb-4 grid gap-2">
          {o.flags.map((f) => (
            <p key={f} role="alert" className="rounded-[var(--radius-card)] border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
              {FLAG_TEXT[f] ?? f}
            </p>
          ))}
        </div>
      ) : null}

      {o.payment === "transfer" && o.status === "pending" ? (
        <p role="status" className="mb-4 rounded-[var(--radius-card)] border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          Waiting for a bank transfer of <span className="num font-bold">{money(o.totals.total)}</span>. The customer sends the receipt on WhatsApp; check
          that the money is in your account before you confirm.
        </p>
      ) : null}

      {o.refund ? (
        <p role="status" className="mb-4 rounded-[var(--radius-card)] border border-rule bg-surface px-4 py-3 text-sm">
          Cancelled and refunded {money(o.refund.amount)} by bank transfer on {dateTime(o.refund.at)}
          {o.refund.reference ? <> · ref <span className="num">{o.refund.reference}</span></> : null}
          {o.refund.restocked ? " · items put back in stock" : " · stock not changed"}
          {o.refund.reason ? ` · ${o.refund.reason}` : ""}
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title="To pack" meta={`${o.items.length} ${o.items.length === 1 ? "line" : "lines"}`} flush>
          <table className="w-full text-sm">
            <thead className="sr-only sm:not-sr-only">
              <tr className="text-left text-xs text-muted">
                <th className="px-5 pb-2 font-normal">Item</th>
                <th className="pb-2 text-right font-normal">Qty</th>
                <th className="hidden pb-2 text-right font-normal sm:table-cell">Price</th>
                <th className="px-5 pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.variantId} className="border-t border-rule">
                  <td className="px-5 py-3">
                    <p className="font-medium">{i.title}</p>
                    <p className="text-xs text-muted">{i.variantLabel}</p>
                  </td>
                  <td className="num py-3 text-right font-bold whitespace-nowrap">{qtyText(i)}</td>
                  <td className="num hidden py-3 text-right text-muted sm:table-cell">{money(i.unitPrice)}</td>
                  <td className="num px-5 py-3 text-right">{money(multiply(i.unitPrice, i.qty))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-sm">
              <tr className="border-t border-rule">
                <td className="px-5 pt-3 text-muted" colSpan={3}>
                  Subtotal
                </td>
                <td className="num px-5 pt-3 text-right">{money(o.totals.subtotal)}</td>
              </tr>
              <tr>
                <td className="px-5 pt-1 text-muted" colSpan={3}>
                  Delivery · {o.delivery.zone}
                </td>
                <td className="num px-5 pt-1 text-right">{money(o.totals.delivery)}</td>
              </tr>
              <tr>
                <td className="px-5 pt-2 pb-4 font-bold" colSpan={3}>
                  Total paid
                </td>
                <td className="num px-5 pt-2 pb-4 text-right text-[15px] font-bold">{money(o.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </Panel>

        <div className="grid gap-4 lg:col-span-4">
          <Panel title="Deliver to">
            <p className="font-medium">{o.customer.name}</p>
            <p className="mt-1">{o.delivery.address}</p>
            <p className="mt-1 text-muted">{o.delivery.zone}</p>
            <p className="mt-2 text-sm">{o.marketingOptIn ? "Agreed to receive offers on WhatsApp and email" : "Didn't ask for offers: don't send marketing"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-control px-3 text-sm font-medium hover:border-text" href={`tel:${o.customer.phone}`}>
                <PhoneIcon size={16} /> {o.customer.phone}
              </a>
              <a
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-control px-3 text-sm font-medium hover:border-text"
                href={whatsapp(o.customer.phone)}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappIcon size={16} /> WhatsApp
              </a>
              <a className="inline-flex h-9 min-w-0 items-center gap-2 rounded-[var(--radius-control)] border border-control px-3 text-sm font-medium hover:border-text" href={`mailto:${o.customer.email}`}>
                <MailIcon size={16} /> <span className="truncate">{o.customer.email}</span>
              </a>
            </div>
          </Panel>
          <Panel title="Timeline">
            <ol className="grid gap-2 text-sm">
              {timeline.map(([label, at]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span className={at ? "" : "text-muted"}>{label}</span>
                  <span className="num text-right text-muted">{at ? dateTime(at) : "—"}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              {[o.city, o.country].filter(Boolean).join(", ") || "—"}
              {o.source ? ` · from ${o.source}` : ""} · Paystack ref <span className="num">{o.paystackRef?.slice(0, 8) ?? "—"}</span>
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
