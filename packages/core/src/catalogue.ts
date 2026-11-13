import type { Line, Product, ProductImage, Unit, Variant } from "./schemas";
import type { Money } from "./money";
import { available } from "./stock";

/**
 * The public catalogue: what the Worker builds on publish and caches at the edge.
 * Contains only live products and only what shoppers may see (no raw stock or reservations).
 */
export interface CatalogueVariant {
  id: string;
  sku: string;
  colour?: string;
  size?: string;
  unit: Unit;
  price: Money;
  /** Units that can be bought right now (stock − reserved, never below 0). */
  available: number;
  lowStock: boolean;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  line: Line;
  title: string;
  description: string;
  images: ProductImage[];
  attributes: Product["attributes"];
  variants: CatalogueVariant[];
  /** Lowest variant price, for listings. */
  fromPrice: Money;
  soldOut: boolean;
  createdAt: string;
  /** True for seed data that must never reach production. */
  placeholder?: boolean;
}

export interface Catalogue {
  version: string;
  builtAt: string;
  products: CatalogueProduct[];
}

export function toCatalogueVariant(v: Variant): CatalogueVariant {
  const avail = available(v);
  return {
    id: v.id,
    sku: v.sku,
    ...(v.options.colour ? { colour: v.options.colour } : {}),
    ...(v.options.size ? { size: v.options.size } : {}),
    unit: v.options.unit,
    price: v.price,
    available: avail,
    lowStock: avail > 0 && avail <= v.lowStockAt,
  };
}

export function toCatalogueProduct(
  p: Product,
  variants: Variant[],
  extra: { placeholder?: boolean } = {},
): CatalogueProduct | null {
  if (p.status !== "live" || variants.length === 0) return null;
  const cv = variants.map(toCatalogueVariant);
  const fromPrice = cv.reduce((min, v) => (v.price.amount < min.amount ? v.price : min), cv[0]!.price);
  return {
    id: p.id,
    slug: p.slug,
    line: p.line,
    title: p.title,
    description: p.description,
    images: p.images,
    attributes: p.attributes,
    variants: cv,
    fromPrice,
    soldOut: cv.every((v) => v.available === 0),
    createdAt: p.createdAt,
    ...(extra.placeholder ? { placeholder: true } : {}),
  };
}

export function buildCatalogue(
  entries: { product: Product; variants: Variant[]; placeholder?: boolean }[],
  now: Date = new Date(),
): Catalogue {
  const products = entries
    .map((e) => toCatalogueProduct(e.product, e.variants, { placeholder: e.placeholder ?? false }))
    .filter((p): p is CatalogueProduct => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { version: now.getTime().toString(36), builtAt: now.toISOString(), products };
}

export function variantLabel(v: Pick<CatalogueVariant, "colour" | "size" | "unit">): string {
  return [v.colour, v.size].filter(Boolean).join(" / ") || unitLabel(v.unit, 1);
}

export function unitLabel(unit: Unit, qty: number): string {
  const one = { yard: "yard", bundle: "bundle", piece: "piece" }[unit];
  return qty === 1 ? one : `${one}s`;
}
