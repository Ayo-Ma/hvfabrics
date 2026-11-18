import { Form } from "react-router";
import { buildSearchIndex, search } from "@hv/core";
import { SearchIcon } from "@hv/ui";
import noResults from "@hv/ui/illustrations/no-results.webp";
import type { Route } from "./+types/search";
import { getCatalogue } from "~/lib/catalogue.server";
import { ProductCard } from "~/components/ProductCard";
import { StateMessage } from "~/components/StateMessage";

/**
 * Search v1 runs on the server against the cached catalogue, so it works without script.
 * Next step (IMPLEMENTATION.md 1.4): ship the index to the browser for instant results as you type.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 80);
  if (!q.trim()) return { q, results: [] };
  const catalogue = await getCatalogue(context.cloudflare.env);
  const index = buildSearchIndex(catalogue.products, catalogue.version);
  const byId = new Map(catalogue.products.map((p) => [p.id, p]));
  const results = search(index, q).flatMap((h) => {
    const p = byId.get(h.doc.id);
    return p ? [p] : [];
  });
  return { q, results };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data?.q ? `“${data.q}” · Search · Harries Vogue` : "Search · Harries Vogue" }, { name: "robots", content: "noindex" }];
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { q, results } = loaderData;
  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <h1 className="text-4xl tracking-(--tracking-display)">Search</h1>
      <Form method="get" role="search" className="mt-6 flex max-w-2xl">
        <label htmlFor="q" className="sr-only">
          Search fabrics, lingerie and ready-to-wear
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          autoFocus={!q}
          placeholder="Silk, satin, lace, ankara…"
          className="min-h-14 flex-1 bg-grey-100 px-4 text-lg placeholder:text-grey-500"
        />
        <button type="submit" className="grid min-h-14 w-14 place-items-center bg-ink text-paper hover:bg-grey-800">
          <SearchIcon title="Search" />
        </button>
      </Form>

      {q.trim() &&
        (results.length === 0 ? (
          <StateMessage illustration={noResults} title={`No match for “${q}”`} headingLevel={2}>
            Try “lace” or “ankara”, or check the spelling.
          </StateMessage>
        ) : (
          <>
            <p className="tabular mt-8 text-[15px] text-grey-600" aria-live="polite">
              {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
              {results.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </>
        ))}
    </div>
  );
}
