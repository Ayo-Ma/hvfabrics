import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { LINE_LABELS, stockState, unitLabel, type Product } from "@hv/core";
import { cx } from "@hv/ui";
import { PlusIcon, SearchIcon } from "@hv/ui/icons";
import emptyProducts from "@hv/ui/illustrations/empty-products.webp";
import { ButtonLink, EmptyLine, ErrorLine, PageHeader, Pill, Skel } from "../components/ui";
import { Thumb } from "../components/Thumb";
import { useProducts, type Entry } from "../lib/data";
import { money } from "../lib/format";

/** Products — "What's in the shop, and what needs a look?" Each row: photo, name, price from, stock left. */

type Status = Product["status"];
const TABS: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "In the shop" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

function summary(e: Entry) {
  const units = new Set(e.variants.map((v) => v.options.unit));
  const available = e.variants.reduce((n, v) => n + Math.max(0, v.stock - v.reserved), 0);
  const states = e.variants.map(stockState);
  const from = e.variants.reduce<Entry["variants"][number]["price"] | null>((m, v) => (!m || v.price.amount < m.amount ? v.price : m), null);
  const unit = units.size === 1 ? [...units][0]! : null;
  return {
    available,
    unit,
    from,
    soldOut: states.length > 0 && states.every((s) => s === "sold_out"),
    low: states.some((s) => s === "low" || s === "sold_out"),
  };
}

export function Products() {
  const q = useProducts();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("show"))?.id ?? "all") as Status | "all";
  const [term, setTerm] = useState("");

  const entries = useMemo(() => q.data?.entries ?? [], [q.data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length, live: 0, draft: 0, archived: 0 };
    for (const e of entries) c[e.product.status] = (c[e.product.status] ?? 0) + 1;
    return c;
  }, [entries]);
  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    return entries.filter((e) => (tab === "all" || e.product.status === tab) && (!t || e.product.title.toLowerCase().includes(t) || e.variants.some((v) => v.sku.toLowerCase().includes(t))));
  }, [entries, tab, term]);

  return (
    <>
      <PageHeader
        title="Products"
        sub={q.data ? `${counts.live} in the shop · ${counts.draft} ${counts.draft === 1 ? "draft" : "drafts"}` : " "}
        actions={
          <ButtonLink to="/products/new" tone="primary" size="lg">
            <PlusIcon size={18} /> Add product
          </ButtonLink>
        }
      />

      {q.error && !q.data ? <ErrorLine error={q.error} at={q.at} retry={() => void q.refresh()} /> : null}

      {q.data && entries.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-10 text-center">
          <img src={emptyProducts} alt="" width={200} height={200} className="h-[160px] w-auto" />
          <p className="mt-4 max-w-sm text-[15px]">No products yet. Add the first one with photos from your phone.</p>
          <ButtonLink to="/products/new" tone="primary" size="lg" className="mt-5">
            <PlusIcon size={18} /> Add product
          </ButtonLink>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Show" className="flex overflow-x-auto border-b border-line">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setParams(t.id === "all" ? {} : { show: t.id }, { replace: true })}
                className={cx("relative h-11 flex-none px-3 text-sm whitespace-nowrap first:pl-0", tab === t.id ? "font-bold text-text" : "text-muted hover:text-text")}
              >
                {t.label} <span className="num">{q.data ? counts[t.id] : ""}</span>
                {tab === t.id ? <span aria-hidden="true" className={cx("absolute right-3 -bottom-px h-0.5 bg-text", i === 0 ? "left-0" : "left-3")} /> : null}
              </button>
            ))}
          </div>

          <div className="my-4 flex items-center justify-between gap-3">
            <label className="relative w-full sm:w-[300px]">
              <span className="sr-only">Find a product</span>
              <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name or SKU" className="field h-9 pl-9" type="search" />
            </label>
            <span className="num hidden text-sm text-muted sm:block">{q.data ? `${rows.length} ${rows.length === 1 ? "product" : "products"}` : ""}</span>
          </div>

          <div className="panel">
            <div className="hidden grid-cols-[1fr_120px_160px] gap-4 px-5 pt-3 pb-2 text-xs text-muted sm:grid">
              <span>Product</span>
              <span className="text-right">Price from</span>
              <span className="text-right">Left to sell</span>
            </div>
            <ul>
              {!q.data
                ? [0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center gap-4 border-t border-rule px-5 py-3 first:border-t-0 sm:first:border-t">
                      <Skel w={48} h={60} />
                      <div className="flex-1">
                        <Skel w="40%" />
                        <Skel w="25%" h={12} className="mt-2" />
                      </div>
                    </li>
                  ))
                : rows.length === 0
                  ? (
                      <li className="p-5">
                        <EmptyLine>{term ? "No products match." : "None here."}</EmptyLine>
                      </li>
                    )
                  : rows.map((e) => <ProductRow key={e.product.id} e={e} />)}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

function ProductRow({ e }: { e: Entry }) {
  const s = summary(e);
  const p = e.product;
  return (
    <li className="border-t border-rule first:border-t-0 sm:first:border-t">
      <Link to={`/products/${p.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-x-4 px-5 py-3 hover:bg-raised/60 sm:grid-cols-[48px_1fr_120px_160px]">
        <Thumb image={p.images[0]} size={48} />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-medium">{p.title}</span>
            {p.status !== "live" ? <Pill>{p.status === "draft" ? "Draft" : "Archived"}</Pill> : null}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {LINE_LABELS[p.line]} · {e.variants.length} {e.variants.length === 1 ? "option" : "options"}
            <span className="sm:hidden"> · from {s.from ? money(s.from) : "—"}</span>
          </p>
        </div>
        <span className="num hidden text-right sm:block">{s.from ? money(s.from) : "—"}</span>
        <span className="flex items-center justify-end gap-2 text-right">
          {s.soldOut ? <Pill tone="neg">Sold out</Pill> : s.low ? <Pill tone="warn">Low</Pill> : null}
          {!s.soldOut ? <span className="num font-medium">{s.unit ? `${s.available} ${unitLabel(s.unit, s.available)}` : s.available}</span> : null}
        </span>
      </Link>
    </li>
  );
}
