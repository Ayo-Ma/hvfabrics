import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, data, useSearchParams, type ShouldRevalidateFunctionArgs } from "react-router";
import { MIN_YARDS, formatMoney, multiply, unitLabel, type CatalogueProduct } from "@hv/core";
import { ArrowRightIcon, CloseIcon, FilterIcon, GridIcon, ListIcon, MinusIcon, PlusIcon, Listbox, cx, type ListboxOption } from "@hv/ui";
import noResults from "@hv/ui/illustrations/no-results.webp";
import type { Route } from "./+types/line";
import { getLine } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, isCloth, lineFromPath } from "~/lib/lines";
import {
  NO_FILTERS,
  SORTS,
  VIEWS,
  VIEW_COOKIE,
  VIEW_LABELS,
  activeCount,
  applyFilters,
  facetsOf,
  readFilters,
  readView,
  writeFilters,
  type Facets,
  type Filters,
  type Sort,
  type View,
} from "~/lib/filters";
import { ProductImage } from "~/components/ProductImage";
import { ProductCard, QuickAdd, StockTag, priceLine } from "~/components/ProductCard";
import { StateMessage } from "~/components/StateMessage";

/*
 * Collection pages. Shoppers choose how to browse, and the choice is remembered (a cookie, so the
 * server draws the same layout and nothing jumps):
 *  - Grid (the default): the normal shop grid, filters in a sidebar on desktop and a sheet on phones;
 *  - Large: two big photographs a row, for looking at texture and colour;
 *  - Shelf: the specimen catalogue: one piece at a time on a colour field, priced for your yards.
 * Filters and sort are the shop's own controls and run in the browser on the cached line, so every
 * change is instant; the URL keeps them, so a filtered page can be shared.
 */

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const line = lineFromPath(url.pathname);
  if (!line) throw data(null, { status: 404 });
  const yardsParam = Number(url.searchParams.get("yards"));
  const yards = Number.isInteger(yardsParam) && yardsParam >= MIN_YARDS && yardsParam <= 30 ? yardsParam : MIN_YARDS;
  const products = await getLine(context.cloudflare.env, line);
  return { line, products, view: readView(request.headers.get("Cookie")) ?? "grid", yards };
}

/** Filtering only changes the query string: the products are already here, so don't ask the server again. */
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [];
  return [{ title: `${LINE_LABELS[data.line]} · Harries Vogue` }, { name: "description", content: LINE_INTROS[data.line] }];
}

const SORT_OPTIONS: ListboxOption<Sort>[] = (Object.keys(SORTS) as Sort[]).map((value) => ({ value, label: SORTS[value] }));

export default function LinePage({ loaderData }: Route.ComponentProps) {
  const { line, products } = loaderData;
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const facets = useMemo(() => facetsOf(products), [products]);
  const shown = useMemo(() => applyFilters(products, filters, facets.bands), [products, params, facets]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setViewState] = useState<View>(loaderData.view);
  const [sheet, setSheet] = useState(false);
  const count = activeCount(filters);

  const update = (next: Partial<Filters>) =>
    setParams((p) => writeFilters(p, { ...readFilters(p), ...next }), { replace: true, preventScrollReset: true });
  const setView = (v: View) => {
    setViewState(v);
    try {
      document.cookie = `${VIEW_COOKIE}=${v}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    } catch {
      /* cookies off: the choice lasts for this page only */
    }
  };
  const sidebar = view !== "shelf";
  const noun = isCloth(line) ? ["fabric", "fabrics"] : ["piece", "pieces"];

  return (
    <div className="collection">
      <header className="collection-head">
        <h1 className="display-size">{LINE_LABELS[line]}</h1>
        <p className="mt-5 max-w-[52ch] text-lg">{LINE_INTROS[line]}</p>
      </header>

      <div className="collection-bar">
        <div className="collection-bar-inner">
          <button type="button" className={cx("bar-btn shrink-0", sidebar && "is-side-open")} onClick={() => setSheet(true)} aria-haspopup="dialog">
            <FilterIcon size={18} /> Filter{count ? <span className="bar-count tabular">{count}</span> : null}
          </button>
          <p className="tabular hidden text-[15px] text-grey-600 sm:block" aria-live="polite">
            {shown.length} of {products.length} {products.length === 1 ? noun[0] : noun[1]}
          </p>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <Listbox
              label="Sort by"
              hideLabel
              prefix={<span className="hidden sm:inline">Sort:</span>}
              value={filters.sort}
              onChange={(sort) => update({ sort })}
              options={SORT_OPTIONS}
              align="end"
              className="min-w-0 shrink"
              buttonClassName="bar-btn bar-select"
              listClassName="sf-list"
              optionClassName="sf-option"
            />
            <ViewSwitch view={view} onChange={setView} />
          </div>
        </div>
      </div>

      <div className={cx("collection-body", sidebar && "has-side")}>
        {sidebar ? (
          <aside className="filter-side" aria-label="Filters">
            <FilterPanel filters={filters} facets={facets} update={update} />
          </aside>
        ) : null}

        <div className="min-w-0">
          <p className="tabular mb-4 text-[15px] text-grey-600 sm:hidden" aria-live="polite">
            {shown.length} of {products.length} {products.length === 1 ? noun[0] : noun[1]}
          </p>
          {count > 0 ? <ActiveChips filters={filters} facets={facets} update={update} /> : null}
          {shown.length === 0 ? (
            <StateMessage
              illustration={noResults}
              title={products.length ? "Nothing matches those filters" : "New pieces are on the way"}
              headingLevel={2}
              {...(products.length
                ? {
                    action: (
                      <button type="button" className="bar-btn is-ink" onClick={() => update(NO_FILTERS)}>
                        Clear all filters
                      </button>
                    ),
                  }
                : {})}
            >
              {products.length ? "Try fewer filters, or clear them to see the whole line." : "Visit our showrooms or check back soon."}
            </StateMessage>
          ) : view === "grid" ? (
            <ul className="grid-view">
              {shown.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} quickAdd headingLevel={2} priority={i < 4} sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 26vw, (min-width: 768px) 33vw, 50vw" />
                </li>
              ))}
            </ul>
          ) : view === "large" ? (
            <ul className="large-view">
              {shown.map((p, i) => (
                <li key={p.id}>
                  <LargeCard product={p} priority={i < 2} />
                </li>
              ))}
            </ul>
          ) : (
            <Shelf products={shown} cloth={isCloth(line)} initialYards={loaderData.yards} />
          )}
        </div>
      </div>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} resultCount={shown.length} onClear={() => update(NO_FILTERS)} canClear={count > 0}>
        <FilterPanel filters={filters} facets={facets} update={update} />
      </FilterSheet>
    </div>
  );
}

/* ---------------- The layout switch ---------------- */

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const icon: Record<View, ReactNode> = {
    grid: <GridIcon size={18} />,
    large: <span aria-hidden="true" className="view-large-icon" />,
    shelf: <ListIcon size={18} />,
  };
  return (
    <div role="radiogroup" aria-label="Layout" className="view-switch">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          tabIndex={view === v ? 0 : -1}
          onClick={() => onChange(v)}
          onKeyDown={(e) => {
            const i = VIEWS.indexOf(view);
            const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = VIEWS[(i + step + VIEWS.length) % VIEWS.length]!;
            onChange(next);
            (e.currentTarget.parentElement?.querySelector(`[data-view="${next}"]`) as HTMLButtonElement | null)?.focus();
          }}
          data-view={v}
          className="view-opt"
        >
          {icon[v]}
          <span className="hidden md:inline">{VIEW_LABELS[v]}</span>
          <span className="sr-only md:hidden">{VIEW_LABELS[v]}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Filters ---------------- */

function Check({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className="check-row">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" className="check-box" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="filter-group">
      <legend className="filter-legend">{title}</legend>
      <div className="grid gap-0.5">{children}</div>
    </fieldset>
  );
}

function toggle<T>(list: T[], item: T, on: boolean): T[] {
  return on ? [...new Set([...list, item])] : list.filter((x) => x !== item);
}

function FilterPanel({ filters, facets, update }: { filters: Filters; facets: Facets; update: (f: Partial<Filters>) => void }) {
  return (
    <div className="filter-panel">
      <div className="filter-group">
        <button type="button" role="switch" aria-checked={filters.stock} onClick={() => update({ stock: !filters.stock })} className="switch-row">
          <span>In stock only</span>
          <span aria-hidden="true" className="switch" />
        </button>
      </div>
      {facets.bands.length ? (
        <Group title="Price">
          {facets.bands.map((b) => (
            <Check key={b.id} checked={filters.price.includes(b.id)} onChange={(on) => update({ price: toggle(filters.price, b.id, on) })}>
              {b.label}
            </Check>
          ))}
        </Group>
      ) : null}
      {facets.colours.length > 1 ? (
        <Group title="Colour">
          {facets.colours.map((c) => (
            <Check key={c} checked={filters.colour.includes(c)} onChange={(on) => update({ colour: toggle(filters.colour, c, on) })}>
              {c}
            </Check>
          ))}
        </Group>
      ) : null}
      {facets.sizes.length > 1 ? (
        <Group title="Size">
          <div className="size-chips">
            {facets.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={filters.size.includes(s)} className="size-chip" onClick={() => update({ size: toggle(filters.size, s, !filters.size.includes(s)) })}>
                {s}
              </button>
            ))}
          </div>
        </Group>
      ) : null}
      {facets.units.length ? (
        <Group title="Sold">
          {facets.units.map((u) => (
            <Check key={u.value} checked={filters.unit.includes(u.value)} onChange={(on) => update({ unit: toggle(filters.unit, u.value, on) })}>
              {u.label}
            </Check>
          ))}
        </Group>
      ) : null}
      {facets.fibres.length > 1 ? (
        <Group title="Fibre">
          {facets.fibres.map((f) => (
            <Check key={f} checked={filters.fibre.includes(f)} onChange={(on) => update({ fibre: toggle(filters.fibre, f, on) })}>
              {f}
            </Check>
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function ActiveChips({ filters, facets, update }: { filters: Filters; facets: Facets; update: (f: Partial<Filters>) => void }) {
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(filters.stock ? [{ key: "stock", label: "In stock", clear: () => update({ stock: false }) }] : []),
    ...filters.price.map((id) => ({ key: `p-${id}`, label: facets.bands.find((b) => b.id === id)?.label ?? id, clear: () => update({ price: filters.price.filter((x) => x !== id) }) })),
    ...filters.colour.map((c) => ({ key: `c-${c}`, label: c, clear: () => update({ colour: filters.colour.filter((x) => x !== c) }) })),
    ...filters.size.map((s) => ({ key: `s-${s}`, label: `Size ${s}`, clear: () => update({ size: filters.size.filter((x) => x !== s) }) })),
    ...filters.unit.map((u) => ({ key: `u-${u}`, label: `By the ${unitLabel(u, 1)}`, clear: () => update({ unit: filters.unit.filter((x) => x !== u) }) })),
    ...filters.fibre.map((f) => ({ key: `f-${f}`, label: f, clear: () => update({ fibre: filters.fibre.filter((x) => x !== f) }) })),
  ];
  return (
    <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Filters on">
      {chips.map((c) => (
        <li key={c.key}>
          <button type="button" className="active-chip" onClick={c.clear}>
            {c.label} <CloseIcon size={14} />
            <span className="sr-only">: remove filter</span>
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="link-quiet ml-2 text-[15px]" onClick={() => update(NO_FILTERS)}>
          Clear all
        </button>
      </li>
    </ul>
  );
}

function FilterSheet({
  open,
  onClose,
  resultCount,
  onClear,
  canClear,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  onClear: () => void;
  canClear: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="filter-sheet"
      aria-labelledby="filter-sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="filter-sheet-inner">
        <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-5 py-4">
          <h2 id="filter-sheet-title" className="text-xl font-bold">Filter</h2>
          <button type="button" className="grid size-11 place-items-center" onClick={onClose}>
            <CloseIcon title="Close filters" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2">{children}</div>
        <div className="flex items-center gap-3 border-t border-grey-200 px-5 py-4">
          <button type="button" className="bar-btn" onClick={onClear} disabled={!canClear}>
            Clear all
          </button>
          <button type="button" className="bar-btn is-yellow flex-1 justify-center" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? "result" : "results"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------------- Large: two big photographs a row ---------------- */

function LargeCard({ product, priority }: { product: CatalogueProduct; priority: boolean }) {
  const image = product.images[0];
  const detail = product.images[2] ?? product.images[1];
  return (
    <article className="large-card group">
      <Link to={`/p/${product.slug}`} className="block">
        <div className="tile-media">
          {image ? <ProductImage image={image} sizes="(min-width: 1024px) 38vw, 100vw" priority={priority} className={cx("product-card-img size-full object-cover", product.soldOut && "opacity-60")} /> : null}
          {detail && !product.soldOut ? <ProductImage image={detail} sizes="(min-width: 1024px) 38vw, 100vw" className="product-card-alt absolute inset-0 size-full object-cover" /> : null}
          <StockTag product={product} />
        </div>
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="large-card-title">
            <Link to={`/p/${product.slug}`} className="product-card-name">{product.title}</Link>
          </h2>
          <p className="tabular mt-1 text-[15px] text-grey-600">{priceLine(product)}</p>
          {product.description ? <p className="mt-3 line-clamp-2 max-w-[52ch] text-base text-grey-700">{product.description}</p> : null}
        </div>
        <QuickAdd product={product} />
      </div>
    </article>
  );
}

/* ---------------- Shelf: the specimen catalogue ---------------- */

const FIELDS = ["field-a", "field-b", "field-c"] as const;
const fieldOf = (i: number) => FIELDS[i % FIELDS.length]!;
const isDouble = (i: number) => i % 6 === 0;

function factFor(p: CatalogueProduct, yards: number, cloth: boolean): { fact: string; short: boolean } {
  if (p.soldOut) return { fact: "Sold out", short: true };
  const unit = p.variants[0]?.unit ?? "yard";
  if (!cloth || unit !== "yard") return { fact: priceLine(p), short: false };
  const buyable = p.variants.filter((v) => v.available > 0);
  const cheapest = buyable.reduce((a, v) => (v.price.amount < a.price.amount ? v : a), buyable[0] ?? p.variants[0]!);
  return { fact: `${formatMoney(multiply(cheapest.price, yards))} for ${yards} yards`, short: false };
}

function Shelf({ products, cloth, initialYards }: { products: CatalogueProduct[]; cloth: boolean; initialYards: number }) {
  const [yards, setYards] = useState(initialYards);
  const [shownIndex, setShown] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const facts = products.map((p) => factFor(p, yards, cloth));

  // The specimen crossing the middle of the screen takes the stage.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setShown(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    list.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [products]);

  const stage = products[shownIndex] ?? products[0];
  const linkFor = (p: CatalogueProduct) => (cloth && (p.variants[0]?.unit ?? "yard") === "yard" ? `/p/${p.slug}?yards=${yards}` : `/p/${p.slug}`);

  return (
    <div className="shelf">
      <div className="shelf-col">
        {cloth ? (
          <div className="yards-control mb-10" role="group" aria-labelledby="yards-label">
            <div className="flex items-center gap-2 sm:gap-3">
              <span id="yards-label" className="yards-lead">I need</span>
              <button type="button" className="yards-btn" onClick={() => setYards((y) => Math.max(MIN_YARDS, y - 1))} disabled={yards <= MIN_YARDS} aria-label="One yard less">
                <MinusIcon />
              </button>
              <output className="yards-value tabular" aria-live="polite">
                <span key={yards} className="tick">{yards}</span> <span className="yards-unit">yards</span>
              </output>
              <button type="button" className="yards-btn" onClick={() => setYards((y) => Math.min(30, y + 1))} disabled={yards >= 30} aria-label="One yard more">
                <PlusIcon />
              </button>
            </div>
            <p className="mt-2 text-[15px] text-grey-600">Every fabric below shows its price for {yards} yards. Cut from {MIN_YARDS} yards up.</p>
          </div>
        ) : null}
        <ul ref={listRef} className="specimens" aria-label="On the shelf">
          {products.map((p, i) => {
            const fact = facts[i]!;
            const image = p.images[0];
            return (
              <li key={p.id} data-i={i} className={cx("specimen", isDouble(i) && "is-double", fact.short && "is-short")}>
                <Link to={linkFor(p)} className="group block" onMouseEnter={() => setShown(i)} onFocus={() => setShown(i)}>
                  <div className={cx("specimen-tile", fieldOf(i))}>
                    {image ? <ProductImage image={image} sizes={isDouble(i) ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 20vw, 50vw"} priority={i < 2} className="specimen-img" /> : null}
                    <StockTag product={p} />
                  </div>
                  <h2 className="specimen-name">
                    <span className="specimen-name-text">{p.title}</span>
                  </h2>
                  <p className={cx("specimen-fact tabular", fact.short && "is-short")}>
                    <span key={fact.fact} className="tick">{fact.fact}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {stage ? (
        <aside className="shelf-stage" aria-label="The piece you're looking at">
          <div className={cx("shelf-stage-field", fieldOf(shownIndex + 1))}>
            <Link to={linkFor(stage)} className="shelf-stage-link link-arrow">
              See it up close <ArrowRightIcon size={18} />
            </Link>
            <div className="shelf-stage-tile">
              {products.map((p, i) =>
                p.images[0] ? (
                  <div key={p.id} aria-hidden={i !== shownIndex} className={cx("shelf-stage-frame", i === shownIndex && "is-active")}>
                    <ProductImage image={p.images[0]} sizes="(min-width: 1024px) 34vw, 1px" className="specimen-img" />
                  </div>
                ) : null,
              )}
            </div>
            <div className="shelf-stage-caption">
              <p className="text-lg font-medium">{stage.title}</p>
              <p className="tabular text-[15px] text-grey-700">{facts[shownIndex]?.fact}</p>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
