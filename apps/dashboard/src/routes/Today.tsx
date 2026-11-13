import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { cuttingList, stockState, takings, type Order, type Takings } from "@hv/core";
import { cx } from "@hv/ui";
import { ScissorsIcon } from "@hv/ui/icons";
import { Bars, type Bar } from "../components/Bars";
import { ButtonLink, EmptyLine, ErrorLine, Freshness, PageHeader, Panel, Skel } from "../components/ui";
import { Thumb } from "../components/Thumb";
import { useMe } from "../lib/auth";
import { TIME_ZONE } from "../lib/config";
import { useBoard, useProducts, useTakings, type Entry } from "../lib/data";
import { ago, longDay, money, qtyText } from "../lib/format";
import { useNow } from "../lib/now";

/**
 * Today — the screen's question: "Has money come in, and what do I need to pack?"
 * The biggest figure is money in today. The finding (orders waiting, the oldest) sits under
 * the title beside the one primary action: pack them. The cutting list is what only a
 * fabric shop needs: every yard to cut across the orders waiting, fabric by fabric.
 */

type Period = "today" | "week" | "month";
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const longName = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const utc = (day: string) => new Date(`${day}T12:00:00Z`);

function barsFor(t: Takings, period: Period, nowHour: number): { bars: Bar[]; every: number } {
  if (period === "today") {
    return {
      every: 6,
      bars: t.hours.map((b, h) => ({
        key: b.key,
        label: `${b.key}:00`,
        long: `${b.key}:00–${String((h + 1) % 24).padStart(2, "0")}:00`,
        value: b.total.amount,
        orders: b.orders,
        // Every hour of today is today's money: the whole series carries the hue.
        current: h <= nowHour,
        now: h === nowHour,
        future: h > nowHour,
      })),
    };
  }
  const days = period === "week" ? t.week : t.month;
  return {
    every: period === "week" ? 1 : 5,
    bars: days.map((b) => ({
      key: b.key,
      label: period === "week" ? dayName.format(utc(b.key)) : String(Number(b.key.slice(8))),
      long: longName.format(utc(b.key)),
      value: b.total.amount,
      orders: b.orders,
      current: b.key === t.today,
      now: b.key === t.today,
      future: b.key > t.today,
    })),
  };
}

const ordersWord = (n: number) => `${n} ${n === 1 ? "order" : "orders"}`;

export function Today() {
  const me = useMe();
  const now = useNow();
  const takingsQ = useTakings(me.can.takings);
  const board = useBoard();
  const products = useProducts(me.can.products);
  const [period, setPeriod] = useState<Period>("today");

  const t = useMemo(() => (takingsQ.data ? takings(takingsQ.data.orders, new Date(now), TIME_ZONE) : null), [takingsQ.data, now]);
  const toPack = useMemo(() => (board.data?.orders ?? []).filter((o) => o.status === "paid").sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? "")), [board.data]);
  const cuts = useMemo(() => cuttingList(toPack), [toPack]);
  const byProduct = useMemo(() => new Map((products.data?.entries ?? []).map((e) => [e.product.id, e])), [products.data]);
  const low = useMemo(() => lowStock(products.data?.entries ?? []), [products.data]);

  if (!me.can.takings) return <Navigate to="/orders" replace />;

  const oldest = toPack[0];
  const finding = board.data
    ? toPack.length === 0
      ? "Nothing waiting to be packed."
      : `${ordersWord(toPack.length)} to pack. The oldest was paid ${oldest?.paidAt ? ago(oldest.paidAt, now).toLowerCase() : "earlier"}.`
    : " ";

  const nowHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now));
  const chart = t ? barsFor(t, period, nowHour) : null;

  return (
    <>
      <PageHeader
        title="Today"
        sub={
          <>
            {longDay(new Date(now))} · <span className="text-text">{finding}</span>
          </>
        }
        actions={toPack.length > 0 ? <ButtonLink to="/orders" tone="primary" size="lg">Pack {ordersWord(toPack.length)}</ButtonLink> : null}
      />

      {/* Money in: the periods are the chart's tabs. */}
      <section className="panel mb-4" aria-labelledby="money-in">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="money-in">Money in</h2>
          <Freshness at={takingsQ.at} loading={takingsQ.loading} onRefresh={() => void takingsQ.refresh()} />
        </div>
        <div role="tablist" aria-label="Period" className="mt-3 grid grid-cols-3 border-y border-rule">
          {PERIODS.map((p, i) => {
            const selected = p.id === period;
            const total = t?.totals[p.id];
            const count = t?.orders[p.id];
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setPeriod(p.id)}
                className={cx(
                  "relative px-3 py-3 text-left sm:px-5 sm:py-4",
                  i > 0 && "border-l border-rule",
                  selected ? "bg-raised sm:bg-transparent" : "hover:bg-raised/60",
                )}
              >
                <span className={cx("block text-xs sm:text-sm", selected ? "font-medium text-text" : "text-muted")}>{p.label}</span>
                {total ? (
                  <span className={cx("num mt-1 block font-bold tracking-[-0.01em] text-text", p.id === "today" ? "text-[22px] leading-7 sm:text-[32px] sm:leading-10" : "text-[17px] leading-7 sm:text-[22px] sm:leading-10")}>
                    {money(total)}
                  </span>
                ) : (
                  <Skel w="70%" h={p.id === "today" ? 32 : 24} className="mt-2" />
                )}
                <span className="num mt-0.5 block text-xs text-muted">{count === undefined ? " " : ordersWord(count)}</span>
                {selected ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-px hidden h-0.5 bg-text sm:block" /> : null}
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-4 pb-5">
          {takingsQ.error && !t ? (
            <ErrorLine error={takingsQ.error} at={takingsQ.at} retry={() => void takingsQ.refresh()} />
          ) : chart ? (
            <Bars
              bars={chart.bars}
              labelEvery={chart.every}
              height={190}
              summary={`${PERIODS.find((p) => p.id === period)!.label}: ${money(t!.totals[period])} from ${ordersWord(t!.orders[period])}. Tap a column for its total.`}
              describe={(b) => (b.future ? `${b.long} · still to come` : `${b.long} · ${money({ amount: b.value, currency: "NGN" })} from ${ordersWord(b.orders)}`)}
            />
          ) : (
            <Skel h={210} />
          )}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          title="To pack"
          meta={board.data ? ordersWord(toPack.length) : undefined}
          action={<Link to="/orders" className="text-sm font-medium underline-offset-4 hover:underline">Orders board</Link>}
          flush
        >
          {board.error && !board.data ? (
            <div className="px-5 pb-4">
              <ErrorLine error={board.error} at={board.at} retry={() => void board.refresh()} />
            </div>
          ) : !board.data ? (
            <RowsLoading />
          ) : toPack.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyLine>Every paid order is packed. New ones appear here and on your phone.</EmptyLine>
            </div>
          ) : (
            <ul>
              {toPack.slice(0, 6).map((o) => (
                <PackRow key={o.id} order={o} now={now} />
              ))}
              {toPack.length > 6 ? (
                <li className="border-t border-rule px-5 py-3 text-sm">
                  <Link to="/orders" className="font-medium underline-offset-4 hover:underline">
                    View all {toPack.length}
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </Panel>

        <div className="grid gap-4 lg:col-span-5">
          <Panel title="Cutting list" meta={cuts.length ? `for ${ordersWord(toPack.length)}` : undefined} flush>
            {!board.data ? (
              <RowsLoading rows={3} />
            ) : cuts.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyLine>Nothing to cut. Fabric from new orders is added up here, one line per colour.</EmptyLine>
              </div>
            ) : (
              <ul>
                {cuts.slice(0, 6).map((c) => {
                  const entry = byProduct.get(c.variantId.slice(0, c.variantId.lastIndexOf("--")));
                  return (
                    <li key={c.variantId} className="flex items-center gap-3 border-t border-rule px-5 py-2.5 first:border-t-0">
                      <Thumb image={entry?.product.images[0]} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="truncate text-xs text-muted">
                          {c.variantLabel} · {c.orders.join(", ")}
                        </p>
                      </div>
                      <span className="num flex items-center gap-1.5 text-[15px] font-bold">
                        {c.unit === "yard" ? <ScissorsIcon size={14} className="text-muted" /> : null}
                        {qtyText(c)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {me.can.products ? (
            <Panel
              title="Running low"
              meta={products.data ? `${low.length} ${low.length === 1 ? "line" : "lines"}` : undefined}
              action={<Link to="/stock" className="text-sm font-medium underline-offset-4 hover:underline">Stock</Link>}
              flush
            >
              {!products.data ? (
                <RowsLoading rows={3} />
              ) : low.length === 0 ? (
                <div className="px-5 pb-5">
                  <EmptyLine>Nothing is low. Lines at or under their low-stock mark show here.</EmptyLine>
                </div>
              ) : (
                <ul>
                  {low.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex items-center gap-3 border-t border-rule px-5 py-2.5 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <Link to={`/products/${l.productId}`} className="block truncate font-medium hover:underline">
                          {l.title}
                        </Link>
                        <p className="truncate text-xs text-muted">{l.label}</p>
                      </div>
                      <span className={cx("num text-[15px] font-bold", l.available === 0 && "text-neg")}>{l.available === 0 ? "Sold out" : `${l.available} left`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

function PackRow({ order, now }: { order: Order; now: number }) {
  const items = order.items.map((i) => `${i.title} · ${i.variantLabel} ${qtyText(i)}`).join(", ");
  return (
    <li className="border-t border-rule first:border-t-0">
      <Link to={`/orders/${order.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-raised/60">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="num font-bold whitespace-nowrap">{order.number}</span>
            <span className="truncate">{order.customer.name}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {order.delivery.zone} · {items}
          </p>
        </div>
        <div className="text-right">
          <p className="num font-bold">{money(order.totals.total)}</p>
          <p className="num mt-0.5 text-xs text-muted">{order.paidAt ? ago(order.paidAt, now) : "—"}</p>
        </div>
      </Link>
    </li>
  );
}

function RowsLoading({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 border-t border-rule px-5 py-3 first:border-t-0">
          <div className="flex-1">
            <Skel w="45%" />
            <Skel w="70%" h={12} className="mt-2" />
          </div>
          <Skel w={72} />
        </li>
      ))}
    </ul>
  );
}

interface LowLine {
  id: string;
  productId: string;
  title: string;
  label: string;
  available: number;
}

function lowStock(entries: Entry[]): LowLine[] {
  const out: LowLine[] = [];
  for (const e of entries) {
    if (e.product.status !== "live") continue;
    for (const v of e.variants) {
      const s = stockState(v);
      if (s === "ok") continue;
      out.push({
        id: v.id,
        productId: e.product.id,
        title: e.product.title,
        label: [v.options.colour, v.options.size].filter(Boolean).join(" / ") || v.sku,
        available: Math.max(0, v.stock - v.reserved),
      });
    }
  }
  return out.sort((a, b) => a.available - b.available);
}
