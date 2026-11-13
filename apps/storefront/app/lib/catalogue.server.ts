import type { Catalogue, CatalogueProduct, Line, Settings } from "@hv/core";
import { seedCatalogue, seedSettings } from "@hv/core/seed";
import { apiFetch } from "./api-fetch.server";

/**
 * The storefront never reads Firestore. It reads the catalogue JSON that the API Worker
 * builds on publish and caches at the edge. Until the API is connected, development
 * uses the placeholder seed catalogue; production refuses to serve placeholders.
 */

export type PublicSettings = Pick<Settings, "deliveryZones" | "policies" | "storeAddress">;

function apiConnected(env: Env): boolean {
  return Boolean(env.API_URL);
}

async function fromApi<T>(env: Env, path: string): Promise<T> {
  const res = await apiFetch(env, path, { cf: { cacheTtl: 30, cacheEverything: true } });
  if (!res.ok) throw new Response("Catalogue unavailable", { status: 503 });
  return (await res.json()) as T;
}

function assertDevFallbackAllowed(env: Env): void {
  if (env.ENVIRONMENT === "production") {
    throw new Response("Catalogue unavailable", { status: 503 });
  }
}

export async function getCatalogue(env: Env): Promise<Catalogue> {
  if (apiConnected(env)) return fromApi<Catalogue>(env, "/catalogue");
  assertDevFallbackAllowed(env);
  return seedCatalogue();
}

export async function getSettings(env: Env): Promise<PublicSettings> {
  if (apiConnected(env)) return fromApi<PublicSettings>(env, "/settings");
  assertDevFallbackAllowed(env);
  const { deliveryZones, policies, storeAddress } = seedSettings;
  return { deliveryZones, policies, storeAddress };
}

export async function getProduct(env: Env, slug: string): Promise<CatalogueProduct | undefined> {
  const c = await getCatalogue(env);
  return c.products.find((p) => p.slug === slug);
}

export async function getLine(env: Env, line: Line): Promise<CatalogueProduct[]> {
  const c = await getCatalogue(env);
  return c.products.filter((p) => p.line === line);
}
