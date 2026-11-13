import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { stockState, unitLabel, type Variant } from "@hv/core";
import { cx } from "@hv/ui";
import { MinusIcon, PlusIcon } from "@hv/ui/icons";
import { EmptyLine, ErrorLine, PageHeader, Pill, Skel } from "../components/ui";
import { Thumb } from "../components/Thumb";
import { ApiError } from "../lib/api";
import { patchStock, useProducts, type Entry } from "../lib/data";

/**
 * Stock — "What's running out, and can I fix the count quickly?"
 * Sold out first, then low, then the rest. Each row saves itself (one save model per view):
 * type a number or tap − / +, and it saves a moment later with a quiet "Saved".
 */

interface Row {
  entry: Entry;
  v: Variant;
  state: ReturnType<typeof stockState>;
}

const ORDER = { sold_out: 0, low: 1, ok: 2 } as const;

export function Stock() {
  const q = useProducts();
  const [params, setParams] = useSearchParams();
  const all = params.get("show") === "all";

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const entry of q.data?.entries ?? []) {
      if (entry.product.status === "archived") continue;
      for (const v of entry.variants) out.push({ entry, v, state: stockState(v) });
    }
    return out.sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.entry.product.title.localeCompare(b.entry.product.title));
  }, [q.data]);
  const attention = rows.filter((r) => r.state !== "ok");
  const shown = all ? rows : attention;
  const soldOut = attention.filter((r) => r.state === "sold_out").length;

  return (
    <>
      <PageHeader
        title="Stock"
        sub={q.data ? (attention.length ? `${soldOut} sold out · ${attention.length - soldOut} running low` : "Nothing is low or sold out.") : " "}
      />
      {q.error && !q.data ? <ErrorLine error={q.error} at={q.at} retry={() => void q.refresh()} /> : null}

      <div role="tablist" aria-label="Show" className="mb-4 flex border-b border-line">
        {[
          { id: false, label: "Needs a look", n: attention.length },
          { id: true, label: "Everything", n: rows.length },
        ].map((t, i) => (
          <button
            key={String(t.id)}
            role="tab"
            aria-selected={all === t.id}
            onClick={() => setParams(t.id ? { show: "all" } : {}, { replace: true })}
            className={cx("relative h-11 px-3 text-sm first:pl-0", all === t.id ? "font-bold text-text" : "text-muted hover:text-text")}
          >
            {t.label} <span className="num">{q.data ? t.n : ""}</span>
            {all === t.id ? <span aria-hidden="true" className={cx("absolute right-3 -bottom-px h-0.5 bg-text", i === 0 ? "left-0" : "left-3")} /> : null}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="hidden grid-cols-[1fr_110px_90px_200px] gap-4 px-5 pt-3 pb-2 text-xs text-muted md:grid">
          <span>Product and option</span>
          <span className="text-right">Left to sell</span>
          <span className="text-right">Held now</span>
          <span className="text-center">In stock</span>
        </div>
        <ul>
          {!q.data ? (
            [0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 border-t border-rule px-5 py-3 first:border-t-0 md:first:border-t">
                <Skel w={36} h={45} />
                <Skel w="40%" />
              </li>
            ))
          ) : shown.length === 0 ? (
            <li className="p-5">
              <EmptyLine>
                {all ? "No products yet." : "Nothing needs a look. Lines show here when they reach their low-stock mark."}
              </EmptyLine>
            </li>
          ) : (
            shown.map((r) => <StockRow key={r.v.id} row={r} />)
          )}
        </ul>
      </div>
    </>
  );
}

function StockRow({ row }: { row: Row }) {
  const { entry, v, state } = row;
  const [value, setValue] = useState(String(v.stock));
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; text?: string }>({ kind: "idle" });
  const timer = useRef<number | undefined>(undefined);
  const available = Math.max(0, v.stock - v.reserved);
  const label = [v.options.colour, v.options.size].filter(Boolean).join(" / ") || v.sku;

  const commit = async (raw: string) => {
    window.clearTimeout(timer.current);
    if (!/^\d+$/.test(raw.trim())) {
      setStatus({ kind: "error", text: "Whole number" });
      return;
    }
    const stock = Number(raw);
    if (stock === v.stock) return;
    setStatus({ kind: "saving" });
    try {
      await patchStock(v.id, { stock });
      setStatus({ kind: "saved" });
    } catch (e) {
      setValue(String(v.stock));
      setStatus({ kind: "error", text: e instanceof ApiError ? e.message : "Not saved" });
    }
  };
  const later = (raw: string) => {
    setValue(raw);
    setStatus({ kind: "idle" });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void commit(raw), 900);
  };
  const step = (by: number) => later(String(Math.max(v.reserved, (Number(value) || 0) + by)));

  return (
    <li className="grid grid-cols-[36px_1fr_auto] items-center gap-x-4 gap-y-2 border-t border-rule px-5 py-3 first:border-t-0 md:grid-cols-[36px_1fr_110px_90px_200px] md:first:border-t">
      <Thumb image={entry.product.images[0]} size={36} />
      <div className="min-w-0">
        <Link to={`/products/${entry.product.id}`} className="block truncate font-medium hover:underline">
          {entry.product.title}
        </Link>
        <p className="flex items-center gap-2 truncate text-xs text-muted">
          {label}
          {state === "sold_out" ? <Pill tone="neg">Sold out</Pill> : state === "low" ? <Pill tone="warn">Low · mark {v.lowStockAt}</Pill> : null}
        </p>
      </div>
      <p className={cx("num text-right text-[15px] font-bold", state === "sold_out" && "text-neg")}>
        {available} <span className="text-xs font-normal text-muted">{unitLabel(v.options.unit, available)}</span>
      </p>
      <p className="num hidden text-right text-muted md:block">{v.reserved > 0 ? v.reserved : "—"}</p>
      <div className="col-span-3 flex items-center justify-end gap-2 md:col-span-1 md:justify-center">
        <span className="mr-auto text-xs text-muted md:hidden">{v.reserved > 0 ? `${v.reserved} held now · in stock` : "In stock"}</span>
        <button type="button" aria-label={`One less ${label}`} onClick={() => step(-1)} className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-control hover:border-text">
          <MinusIcon size={16} />
        </button>
        <input
          aria-label={`${entry.product.title} ${label} in stock`}
          inputMode="numeric"
          value={value}
          onChange={(e) => later(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void commit((e.target as HTMLInputElement).value)}
          className="field num h-10 w-20 text-center"
        />
        <button type="button" aria-label={`One more ${label}`} onClick={() => step(1)} className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-control hover:border-text">
          <PlusIcon size={16} />
        </button>
        <span aria-live="polite" className="w-12 text-xs text-muted">
          {status.kind === "saving" ? "Saving" : status.kind === "saved" ? "Saved" : ""}
        </span>
      </div>
      {status.kind === "error" ? (
        <p role="alert" className="col-span-full text-right text-xs text-neg">
          {status.text}
        </p>
      ) : null}
    </li>
  );
}
