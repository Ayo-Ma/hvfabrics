import { useState } from "react";
import { Link, useParams } from "react-router";
import { BOARD_LABELS, multiply, type OrderStatus } from "@hv/core";
import { ChevronLeftIcon, MailIcon, PhoneIcon, PrintIcon, WhatsappIcon } from "@hv/ui/icons";
import { Button, ErrorLine, PageHeader, Panel, Pill, Skel } from "../components/ui";
import { useOrder, type BoardStatus } from "../lib/data";
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

export function OrderDetail() {
  const { id = "" } = useParams();
  const q = useOrder(id);
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
