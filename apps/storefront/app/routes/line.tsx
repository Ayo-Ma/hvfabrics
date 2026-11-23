import { useEffect, useMemo, useRef, useState } from "react";
import { Form, Link, data, useSubmit } from "react-router";
import { MIN_YARDS, formatMoney, multiply, unitLabel, type CatalogueProduct, type Line } from "@hv/core";
import { ArrowRightIcon, MinusIcon, PlusIcon, cx } from "@hv/ui";
import noResults from "@hv/ui/illustrations/no-results.webp";
import type { Route } from "./+types/line";
import { getLine } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, lineFromPath } from "~/lib/lines";
import { ProductImage } from "~/components/ProductImage";
import { StockTag } from "~/components/ProductCard";
import { StateMessage } from "~/components/StateMessage";

/*
 * Collection pages — "The specimen catalogue" (design-taste-frontend, seed in .taste-skill/shop).
 * Idea: every bolt on her shelf becomes a specimen in a field guide: alone on a flat field, same scale,
 * named plainly with its facts. Live thing: tell us your yards once and the whole shelf re-prices for
 * that length and says which bolts don't have enough (lingerie and ready-to-wear: pick your size).
 * Desktop: the specimen you're looking at is shown large on a sticky colour field beside the shelf.
 */

const SORTS = {
  new: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
type Sort = keyof typeof SORTS;

function sortProducts(list: CatalogueProduct[], sort: Sort): CatalogueProduct[] {
  const copy = [...list];
  if (sort === "price-asc") copy.sort((a, b) => a.fromPrice.amount - b.fromPrice.amount);
  else if (sort === "price-desc") copy.sort((a, b) => b.fromPrice.amount - a.fromPrice.amount);
  else copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Sold-out items always sink to the end, whatever the sort.
  return copy.sort((a, b) => Number(a.soldOut) - Number(b.soldOut));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const line = lineFromPath(url.pathname);
  if (!line) throw data(null, { status: 404 });
  const sortParam = url.searchParams.get("sort");
  const sort: Sort = sortParam && sortParam in SORTS ? (sortParam as Sort) : "new";
  const inStock = url.searchParams.get("stock") === "1";
  const yardsParam = Number(url.searchParams.get("yards"));
  const yards = Number.isInteger(yardsParam) && yardsParam >= MIN_YARDS && yardsParam <= 30 ? yardsParam : 5;
  const all = await getLine(context.cloudflare.env, line);
  const products = sortProducts(inStock ? all.filter((p) => !p.soldOut) : all, sort);
  return { line, products, total: all.length, sort, inStock, yards };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [];
  return [
    { title: `${LINE_LABELS[data.line]} · Harries Vogue` },
    { name: "description", content: LINE_INTROS[data.line].startsWith("[TBC") ? `${LINE_LABELS[data.line]} from Harries Vogue, delivered across Nigeria.` : LINE_INTROS[data.line] },
  ];
}

/** The flat fields the specimens sit on, in a steady rotation. */
const FIELDS = ["field-a", "field-b", "field-c"] as const;
const fieldOf = (i: number) => FIELDS[i % FIELDS.length]!;
/** One tile in every six is double size. */
const isDouble = (i: number) => i % 6 === 0;

const COUNT_WORD: Record<Line, [string, string]> = { fabric: ["bolt", "bolts"], lingerie: ["piece", "pieces"], rtw: ["piece", "pieces"] };

/* ---------------- What each specimen says for the visitor's yards or size ---------------- */

type Fit = { fact: string; short: boolean };

function fabricFit(p: CatalogueProduct, yards: number): Fit {
  const unit = p.variants[0]?.unit ?? "yard";
  if (p.soldOut) return { fact: "Sold out", short: true };
  if (unit !== "yard") return { fact: `${formatMoney(p.fromPrice)} per ${unitLabel(unit, 1)}`, short: false };
  const cheapest = p.variants.filter((v) => v.available > 0).reduce((a, v) => (v.price.amount < a.price.amount ? v : a), p.variants.find((v) => v.available > 0) ?? p.variants[0]!);
  return { fact: `${formatMoney(multiply(cheapest.price, yards))} for ${yards} yards`, short: false };
}

function sizeFit(p: CatalogueProduct, size: string | null): Fit {
  if (p.soldOut) return { fact: "Sold out", short: true };
  const inStock = [...new Set(p.variants.filter((v) => v.available > 0 && v.size).map((v) => v.size!))];
  const price = formatMoney(p.fromPrice);
  if (!size) return { fact: inStock.length ? `${price} · ${inStock.join(", ")}` : price, short: false };
  const has = p.variants.some((v) => v.size === size && v.available > 0);
  return has ? { fact: `${price} · in ${size}`, short: false } : { fact: `${price} · not in ${size} right now`, short: true };
}

/* ---------------- The page ---------------- */

export default function LinePage({ loaderData }: Route.ComponentProps) {
  const { line, products, total, sort, inStock } = loaderData;
  const submit = useSubmit();
  const isFabric = line === "fabric";
  const [yards, setYards] = useState(loaderData.yards);
  const sizes = useMemo(() => {
    const order = ["XS", "S", "M", "L", "XL", "XXL"];
    const all = [...new Set(products.flatMap((p) => p.variants.map((v) => v.size).filter((s): s is string => Boolean(s))))];
    return all.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b));
  }, [products]);
  const [size, setSize] = useState<string | null>(null);
  const fits = products.map((p) => (isFabric ? fabricFit(p, yards) : sizeFit(p, size)));
  const [shown, setShown] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [plural, singular] = [COUNT_WORD[line][1], COUNT_WORD[line][0]];

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

  const stage = products[shown] ?? products[0];
  const stageFit = stage ? fits[shown] ?? fits[0] : undefined;
  const linkFor = (p: CatalogueProduct) => (isFabric && (p.variants[0]?.unit ?? "yard") === "yard" ? `/p/${p.slug}?yards=${yards}` : `/p/${p.slug}`);

  return (
    <div className="shelf">
      <div className="shelf-col">
        <header className="shelf-intro">
          <h1 className="display-size">{LINE_LABELS[line]}</h1>
          <p className="mt-5 max-w-[38ch] text-lg">{LINE_INTROS[line]}</p>

          {isFabric ? (
            <div className="yards-control" role="group" aria-labelledby="yards-label">
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
              <p className="mt-2 text-[15px] text-grey-600">Every bolt below shows its price for {yards} yards. Cut from {MIN_YARDS} yards up.</p>
            </div>
          ) : sizes.length ? (
            <div className="yards-control" role="group" aria-labelledby="size-label">
              <p id="size-label" className="text-[15px] font-semibold">Your size</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[null, ...sizes].map((s) => (
                  <button key={s ?? "all"} type="button" aria-pressed={size === s} className={cx("chip", size === s && "is-on")} onClick={() => setSize(s)}>
                    {s ?? "All sizes"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Form method="get" replace preventScrollReset onChange={(e) => submit(e.currentTarget, { replace: true, preventScrollReset: true })} className="shelf-filters">
            {isFabric ? <input type="hidden" name="yards" value={yards} /> : null}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="size-5 accent-ink" />
              In stock only
            </label>
            <label className="flex items-center gap-2 text-[15px]">
              <span>Sort</span>
              <select name="sort" defaultValue={sort} className="min-h-11 bg-grey-100 px-3 text-[15px]">
                {Object.entries(SORTS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <noscript>
              <button type="submit" className="min-h-11 bg-ink px-4 text-paper">Apply</button>
            </noscript>
          </Form>
          <p className="tabular mt-6 text-[15px] text-grey-600" aria-live="polite">
            {products.length} of {total} {total === 1 ? singular : plural} on the shelf
          </p>
        </header>

        {products.length === 0 ? (
          <StateMessage illustration={noResults} title="Nothing here right now" headingLevel={2}>
            {inStock ? "Everything in this line is sold out. Untick “In stock only” to see it all." : "New pieces are on the way."}
          </StateMessage>
        ) : (
          <ul ref={listRef} className="specimens" aria-label={`${LINE_LABELS[line]} on the shelf`}>
            {products.map((p, i) => {
              const fit = fits[i]!;
              const image = p.images[0];
              return (
                <li key={p.id} data-i={i} className={cx("specimen", isDouble(i) && "is-double", fit.short && "is-short")} data-rise style={{ ["--rise-i" as string]: i % 4 }}>
                  <Link to={linkFor(p)} className="group block" onMouseEnter={() => setShown(i)} onFocus={() => setShown(i)}>
                    <div className={cx("specimen-tile", fieldOf(i))}>
                      {image ? (
                        <ProductImage image={image} sizes={isDouble(i) ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 20vw, 50vw"} priority={i < 2} className="specimen-img" />
                      ) : null}
                      <span className="absolute left-3 top-3"><StockTag product={p} /></span>
                    </div>
                    <h2 className="specimen-name">
                      <span className="specimen-name-text">{p.title}</span>
                    </h2>
                    <p className={cx("specimen-fact tabular", fit.short && "is-short")}>
                      <span key={fit.fact} className="tick">{fit.fact}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {stage ? (
        <aside className="shelf-stage" aria-label="The piece you're looking at">
          <div className={cx("shelf-stage-field", fieldOf(shown + 1))}>
            <Link to={linkFor(stage)} className="shelf-stage-link link-arrow">
              See it up close <ArrowRightIcon size={18} />
            </Link>
            <div className="shelf-stage-tile">
              {products.map((p, i) =>
                p.images[0] ? (
                  <div key={p.id} aria-hidden={i !== shown} className={cx("shelf-stage-frame", i === shown && "is-active")}>
                    <ProductImage image={p.images[0]} sizes="(min-width: 1024px) 34vw, 1px" className="specimen-img" />
                  </div>
                ) : null,
              )}
            </div>
            <div className="shelf-stage-caption">
              <p className="text-lg font-medium">{stage.title}</p>
              <p className="tabular text-[15px] text-grey-700">{stageFit?.fact}</p>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
