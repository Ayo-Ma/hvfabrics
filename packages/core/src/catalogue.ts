import type { Line, Product, ProductImage, Unit, Variant } from "./schemas";
import type { Money } from "./money";
import { minQty } from "./order";
import { available } from "./stock";

/**
 * The public catalogue: what the Worker builds on publish and caches at the edge.
 * Contains only live products and only what shoppers may see: never a stock count or reservation
 * (owner's decision 2026-11-23: customers must not know how many yards remain).
 */

/** What the public catalogue says for anything on sale. It is the most one order line can take, not a stock figure. */
export const PUBLIC_LINE_LIMIT = 100;

export interface CatalogueVariant {
  id: string;
  sku: string;
  colour?: string;
  size?: string;
  unit: Unit;
  price: Money;
  /** 0 when it can't be bought (including less than the minimum cut), otherwise PUBLIC_LINE_LIMIT. Never the real count. */
  available: number;
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
  return {
    id: v.id,
    sku: v.sku,
    ...(v.options.colour ? { colour: v.options.colour } : {}),
    ...(v.options.size ? { size: v.options.size } : {}),
    unit: v.options.unit,
    price: v.price,
    available: available(v) >= minQty(v.options.unit) ? PUBLIC_LINE_LIMIT : 0,
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

/** Ankara comes in whole pieces of 6 yards and is sold by the piece (owner, 2026-11-27). */
export const ANKARA_PIECE_YARDS = 6;

/** "6 yards" for an Ankara piece; null for anything else. Shown beside the price so a piece is never a mystery. */
export function pieceNote(line: Line, unit: Unit | undefined): string | null {
  return line === "ankara" && unit === "piece" ? `${ANKARA_PIECE_YARDS} yards` : null;
}

export function unitLabel(unit: Unit, qty: number): string {
  const one = { yard: "yard", bundle: "bundle", piece: "piece" }[unit];
  return qty === 1 ? one : `${one}s`;
}
