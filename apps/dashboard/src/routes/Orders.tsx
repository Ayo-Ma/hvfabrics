import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BOARD_LABELS, type Order } from "@hv/core";
import { cx } from "@hv/ui";
import { PrintIcon, SearchIcon } from "@hv/ui/icons";
import emptyOrders from "@hv/ui/illustrations/empty-orders.webp";
import { Button, EmptyLine, ErrorLine, Freshness, PageHeader, Skel, showToast } from "../components/ui";
import { ApiError } from "../lib/api";
import { moveOrder, useBoard, type BoardStatus } from "../lib/data";
import { ago, money, qtyText } from "../lib/format";
import { useNow } from "../lib/now";
import { printOrder } from "../lib/print";

/**
 * Orders board — the question: "What do I pack and send next?"
 * New → Packed → Sent, oldest payment first in New so nothing waits too long.
 * On a phone, one column at a time behind tabs that show each column's count.
 */

type Column = { id: "paid" | "packed" | "shipped"; next: BoardStatus; nextLabel: string; empty: string };

const COLUMNS: Column[] = [
  { id: "paid", next: "packed", nextLabel: "Mark packed", empty: "No new orders. Paid orders arrive here, and on your phone." },
  { id: "packed", next: "shipped", nextLabel: "Mark sent", empty: "Nothing packed and waiting to go." },
  { id: "shipped", next: "delivered", nextLabel: "Delivered", empty: "Nothing sent recently." },
];

export const FLAG_TEXT: Record<string, string> = {
  paid_after_expiry_stock_short: "Paid after the 15-minute hold ended and the stock had gone. Contact the customer before packing.",
};

export function Orders() {
  const board = useBoard();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const tab = (COLUMNS.find((c) => c.id === params.get("col"))?.id ?? "paid") as Column["id"];
  const [q, setQ] = useState("");

  const columns = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = (board.data?.orders ?? []).filter(
      (o) => !term || o.number.toLowerCase().includes(term) || o.customer.name.toLowerCase().includes(term) || o.customer.phone.includes(term),
    );
    const by = (s: Column["id"]) => all.filter((o) => o.status === s);
    return {
      // Oldest first where she works through a queue; newest first for what's already sent.
      paid: by("paid").sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? "")),
      packed: by("packed").sort((a, b) => (a.packedAt ?? "").localeCompare(b.packedAt ?? "")),
      shipped: by("shipped").sort((a, b) => (b.shippedAt ?? "").localeCompare(a.shippedAt ?? "")),
    };
  }, [board.data, q]);

  const total = board.data?.orders.length ?? 0;

  return (
    <>
      <PageHeader
        title="Orders"
        sub={board.data ? `${columns.paid.length} new · ${columns.packed.length} packed · ${columns.shipped.length} sent recently` : " "}
        actions={<Freshness at={board.at} loading={board.loading} onRefresh={() => void board.refresh()} />}
      />

      {board.error && !board.data ? <ErrorLine error={board.error} at={board.at} retry={() => void board.refresh()} /> : null}

      {board.data && total === 0 && !q ? (
        <div className="panel flex flex-col items-center px-6 py-10 text-center">
          <img src={emptyOrders} alt="" width={200} height={200} className="h-[160px] w-auto" />
          <p className="mt-4 max-w-sm text-[15px]">No orders yet. When a customer pays, the order lands in New and your phone gets an alert.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="relative w-full sm:w-[300px]">
              <span className="sr-only">Find an order</span>
              <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name or phone" className="field h-9 pl-9" type="search" />
            </label>
          </div>

          {/* Phone: one column at a time */}
          <div role="tablist" aria-label="Board columns" className="mb-4 flex border-b border-line lg:hidden">
            {COLUMNS.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={tab === c.id}
                onClick={() => setParams({ col: c.id }, { replace: true })}
                className={cx("relative h-11 flex-1 text-sm", tab === c.id ? "font-bold text-text" : "text-muted")}
              >
                {BOARD_LABELS[c.id]} <span className="num">{board.data ? columns[c.id].length : ""}</span>
                {tab === c.id ? <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-text" /> : null}
              </button>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            {COLUMNS.map((c) => (
              <section key={c.id} aria-label={BOARD_LABELS[c.id]} className={cx(tab === c.id ? "block" : "hidden", "lg:block")}>
                <h2 className="mb-3 hidden items-baseline gap-2 lg:flex">
                  {BOARD_LABELS[c.id]}
                  <span className="num text-sm font-normal text-muted">{board.data ? columns[c.id].length : ""}</span>
                </h2>
                <ul className="grid gap-2">
                  {!board.data ? (
                    [0, 1].map((i) => (
                      <li key={i} className="panel p-4">
                        <Skel w="50%" />
                        <Skel w="80%" h={12} className="mt-3" />
                        <Skel w="35%" h={36} className="mt-4" />
                      </li>
                    ))
                  ) : columns[c.id].length === 0 ? (
                    <li>
                      <EmptyLine>{q ? "No orders match." : c.empty}</EmptyLine>
                    </li>
                  ) : (
                    columns[c.id].map((o) => <OrderCard key={o.id} order={o} column={c} now={now} />)
                  )}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const BACK: Partial<Record<BoardStatus, BoardStatus>> = { packed: "paid", shipped: "packed", delivered: "shipped" };

export async function move(order: Order, to: BoardStatus) {
  try {
    const next = await moveOrder(order, to);
    const back = BACK[to];
    showToast(`${next.number} moved to ${BOARD_LABELS[to]}`, back ? { label: "Undo", run: () => void move(next, back) } : undefined);
  } catch (e) {
    showToast(e instanceof ApiError ? e.message : "Couldn't move the order. Try again.");
  }
}

function OrderCard({ order, column, now }: { order: Order; column: Column; now: number }) {
  const [busy, setBusy] = useState(false);
  const when = column.id === "paid" ? order.paidAt : column.id === "packed" ? order.packedAt : order.shippedAt;
  const shown = order.items.slice(0, 3);
  return (
    <li className="panel">
      <div className="px-4 pt-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={`/orders/${order.id}`} className="min-w-0 truncate">
            <span className="num font-bold hover:underline">{order.number}</span> <span className="text-muted">·</span> <span>{order.customer.name}</span>
          </Link>
          <span className="num flex-none font-bold">{money(order.totals.total)}</span>
        </div>
        <p className="num mt-0.5 text-xs text-muted">
          {order.delivery.zone} · {column.id === "paid" ? "paid" : column.id === "packed" ? "packed" : "sent"} {when ? ago(when, now).toLowerCase() : "—"}
        </p>
        <ul className="mt-2.5 grid gap-1 text-sm">
          {shown.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {i.title} <span className="text-muted">· {i.variantLabel}</span>
              </span>
              <span className="num flex-none font-medium">{qtyText(i)}</span>
            </li>
          ))}
          {order.items.length > shown.length ? <li className="text-xs text-muted">and {order.items.length - shown.length} more</li> : null}
        </ul>
        {order.flags?.length ? (
          <div className="mt-2.5 flex flex-col gap-1">
            {order.flags.map((f) => (
              <p key={f} className="rounded-[var(--radius-chip)] border border-warn-line bg-warn-bg px-2.5 py-1.5 text-xs text-warn-ink">
                {FLAG_TEXT[f] ?? f}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-rule px-4 py-2.5">
        <Button
          tone={column.id === "shipped" ? "ghost" : "secondary"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await move(order, column.next);
            setBusy(false);
          }}
        >
          {column.nextLabel}
        </Button>
        <Button tone="ghost" className="ml-auto" onClick={() => void printOrder(order, "slip")} aria-label={`Print slip for ${order.number}`}>
          <PrintIcon size={16} /> Slip
        </Button>
      </div>
    </li>
  );
}

