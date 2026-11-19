import { Form, data, useSubmit } from "react-router";
import type { CatalogueProduct } from "@hv/core";
import noResults from "@hv/ui/illustrations/no-results.webp";
import type { Route } from "./+types/line";
import { getLine } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, lineFromPath } from "~/lib/lines";
import { ProductCard } from "~/components/ProductCard";
import { StateMessage } from "~/components/StateMessage";

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
  const all = await getLine(context.cloudflare.env, line);
  const products = sortProducts(inStock ? all.filter((p) => !p.soldOut) : all, sort);
  return { line, products, total: all.length, sort, inStock };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [];
  return [
    { title: `${LINE_LABELS[data.line]} · Harries Vogue` },
    { name: "description", content: LINE_INTROS[data.line].startsWith("[TBC") ? `${LINE_LABELS[data.line]} from Harries Vogue, delivered across Nigeria.` : LINE_INTROS[data.line] },
  ];
}

export default function LinePage({ loaderData }: Route.ComponentProps) {
  const { line, products, total, sort, inStock } = loaderData;
  const submit = useSubmit();
  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <h1 className="text-4xl tracking-(--tracking-display)">{LINE_LABELS[line]}</h1>
          <p className="mt-4 max-w-xl text-lg text-grey-600">{LINE_INTROS[line]}</p>
        </div>
        <Form
          method="get"
          replace
          preventScrollReset
          onChange={(e) => submit(e.currentTarget, { replace: true, preventScrollReset: true })}
          className="flex flex-wrap items-center gap-4 md:col-span-5 md:justify-end"
        >
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
            <button type="submit" className="min-h-11 bg-ink px-4 text-paper">
              Apply
            </button>
          </noscript>
        </Form>
      </div>

      <p className="tabular mt-8 text-[15px] text-grey-600" aria-live="polite">
        {products.length} of {total} {total === 1 ? "piece" : "pieces"}
      </p>

      {products.length === 0 ? (
        <StateMessage illustration={noResults} title="Nothing here right now" headingLevel={2}>
          {inStock ? "Everything in this line is sold out. Untick “In stock only” to see it all." : "New pieces are on the way."}
        </StateMessage>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
