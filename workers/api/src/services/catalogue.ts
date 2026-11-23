import { buildCatalogue, buildSearchIndex, type Catalogue } from "@hv/core";
import type { Deps } from "../deps";

/**
 * The catalogue is built from the store and kept in KV, so shoppers never read Firestore
 * (PLAN.md trap 2: Firestore's 50K reads/day). It's rebuilt whenever stock or products change.
 */
// v2: stock counts removed. The new key means nothing cached with counts is ever served again.
const CATALOGUE_KEY = "catalogue:v2";
const SEARCH_KEY = "search-index:v2";

export async function rebuildCatalogue(deps: Deps): Promise<Catalogue> {
  const entries = await deps.store.listCatalogueEntries();
  const catalogue = buildCatalogue(
    entries.map((e) => ({ ...e, placeholder: deps.placeholderData })),
    deps.now(),
  );
  const index = buildSearchIndex(catalogue.products, catalogue.version);
  await Promise.all([
    deps.kv.put(CATALOGUE_KEY, JSON.stringify(catalogue)),
    deps.kv.put(SEARCH_KEY, JSON.stringify(index)),
  ]);
  return catalogue;
}

export async function catalogueJson(deps: Deps): Promise<string> {
  const cached = await deps.kv.get(CATALOGUE_KEY);
  if (cached) return cached;
  return JSON.stringify(await rebuildCatalogue(deps));
}

export async function searchIndexJson(deps: Deps): Promise<string> {
  const cached = await deps.kv.get(SEARCH_KEY);
  if (cached) return cached;
  await rebuildCatalogue(deps);
  return (await deps.kv.get(SEARCH_KEY)) ?? "{}";
}

/** Rebuild after the response is sent; a failure is logged, never shown to the shopper. */
export function rebuildLater(deps: Deps, reason: string): void {
  deps.waitUntil(
    rebuildCatalogue(deps).catch((e: unknown) => deps.log("catalogue rebuild failed", { reason, error: String(e) })),
  );
}
