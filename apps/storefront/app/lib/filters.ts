import { formatMoney, unitLabel, type CatalogueProduct, type Unit } from "@hv/core";

/**
 * Collection filters and sorting, done in the browser on the line's products (the whole line is
 * already in the cached catalogue, so filtering never waits for the network). The URL holds the
 * state, so a filtered page can be shared and the back button works.
 */

export const SORTS = {
  new: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A to Z",
} as const;
export type Sort = keyof typeof SORTS;

export const VIEWS = ["grid", "large", "shelf"] as const;
export type View = (typeof VIEWS)[number];
export const VIEW_LABELS: Record<View, string> = { grid: "Grid", large: "Large", shelf: "Shelf" };
export const VIEW_COOKIE = "hv_view";

export interface Filters {
  stock: boolean;
  price: string[];
  colour: string[];
  size: string[];
  unit: Unit[];
  fibre: string[];
  sort: Sort;
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20) : []);

export function readFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  return {
    stock: params.get("stock") === "1",
    price: list(params.get("price")),
    colour: list(params.get("colour")),
    size: list(params.get("size")),
    unit: list(params.get("unit")).filter((u): u is Unit => u === "yard" || u === "bundle" || u === "piece"),
    fibre: list(params.get("fibre")),
    sort: sort && sort in SORTS ? (sort as Sort) : "new",
  };
}

/** Writes the filters into `params`, leaving any other parameters (e.g. yards) alone. */
export function writeFilters(params: URLSearchParams, f: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (k: string, v: string | null) => (v ? next.set(k, v) : next.delete(k));
  set("stock", f.stock ? "1" : null);
  set("price", f.price.join(",") || null);
  set("colour", f.colour.join(",") || null);
  set("size", f.size.join(",") || null);
  set("unit", f.unit.join(",") || null);
  set("fibre", f.fibre.join(",") || null);
  set("sort", f.sort === "new" ? null : f.sort);
  return next;
}

export const activeCount = (f: Filters) => Number(f.stock) + f.price.length + f.colour.length + f.size.length + f.unit.length + f.fibre.length;

export const NO_FILTERS: Omit<Filters, "sort"> = { stock: false, price: [], colour: [], size: [], unit: [], fibre: [] };

/* ---------------- Price bands from the line's own prices ---------------- */

export interface Band {
  id: string;
  label: string;
  min: number;
  max: number;
}

const STEPS = [100_000, 200_000, 250_000, 500_000, 1_000_000, 2_000_000, 2_500_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000];
/** Rounds kobo to a price people would say out loud (₦2,000, ₦5,000, ₦10,000 …). */
function roundNice(kobo: number): number {
  const step = STEPS.find((s) => kobo / s < 20) ?? STEPS[STEPS.length - 1]!;
  return Math.max(step, Math.round(kobo / step) * step);
}

/** Up to four bands that split the line's prices roughly evenly; none for fewer than four products. */
export function priceBands(products: CatalogueProduct[]): Band[] {
  const prices = [...new Set(products.map((p) => p.fromPrice.amount))].sort((a, b) => a - b);
  if (prices.length < 4) return [];
  const currency = products[0]!.fromPrice.currency;
  const cuts = [...new Set([0.25, 0.5, 0.75].map((q) => roundNice(prices[Math.floor(q * (prices.length - 1))]!)))].sort((a, b) => a - b);
  const money = (amount: number) => formatMoney({ amount, currency });
  const bands: Band[] = [];
  let lo = 0;
  cuts.forEach((cut, i) => {
    bands.push({ id: `b${i}`, label: i === 0 ? `Under ${money(cut)}` : `${money(lo)} to ${money(cut)}`, min: lo, max: cut });
    lo = cut;
  });
  bands.push({ id: `b${cuts.length}`, label: `${money(lo)} and over`, min: lo, max: Number.POSITIVE_INFINITY });
  // Only bands something falls into.
  return bands.filter((b) => products.some((p) => p.fromPrice.amount >= b.min && p.fromPrice.amount < b.max));
}

/* ---------------- What the line can be filtered by ---------------- */

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export interface Facets {
  bands: Band[];
  colours: string[];
  sizes: string[];
  units: { value: Unit; label: string }[];
  fibres: string[];
}

export function facetsOf(products: CatalogueProduct[]): Facets {
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => Boolean(x && x.trim())))];
  const sizes = uniq(products.flatMap((p) => p.variants.map((v) => v.size)));
  sizes.sort((a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b, "en", { numeric: true }));
  const units = uniq(products.flatMap((p) => p.variants.map((v) => v.unit))) as Unit[];
  return {
    bands: priceBands(products),
    colours: uniq(products.flatMap((p) => p.variants.map((v) => v.colour))).sort((a, b) => a.localeCompare(b)),
    sizes,
    units: units.length > 1 ? units.map((u) => ({ value: u, label: `By the ${unitLabel(u, 1)}` })) : [],
    fibres: uniq(products.map((p) => p.attributes.fibre)).sort((a, b) => a.localeCompare(b)),
  };
}

/* ---------------- Apply ---------------- */

export function applyFilters(products: CatalogueProduct[], f: Filters, bands: Band[]): CatalogueProduct[] {
  const chosenBands = bands.filter((b) => f.price.includes(b.id));
  const out = products.filter((p) => {
    // A filter on an option only counts variants that can still be bought when "in stock" is on.
    const variants = f.stock ? p.variants.filter((v) => v.available > 0) : p.variants;
    if (f.stock && (p.soldOut || variants.length === 0)) return false;
    if (chosenBands.length && !chosenBands.some((b) => p.fromPrice.amount >= b.min && p.fromPrice.amount < b.max)) return false;
    if (f.colour.length && !variants.some((v) => v.colour && f.colour.includes(v.colour))) return false;
    if (f.size.length && !variants.some((v) => v.size && f.size.includes(v.size))) return false;
    if (f.unit.length && !variants.some((v) => f.unit.includes(v.unit))) return false;
    if (f.fibre.length && !(p.attributes.fibre && f.fibre.includes(p.attributes.fibre))) return false;
    return true;
  });
  return sortProducts(out, f.sort);
}

export function sortProducts(products: CatalogueProduct[], sort: Sort): CatalogueProduct[] {
  const copy = [...products];
  if (sort === "price-asc") copy.sort((a, b) => a.fromPrice.amount - b.fromPrice.amount);
  else if (sort === "price-desc") copy.sort((a, b) => b.fromPrice.amount - a.fromPrice.amount);
  else if (sort === "name") copy.sort((a, b) => a.title.localeCompare(b.title));
  else copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Sold-out pieces always sink to the end, whatever the sort (stable sort keeps the order above).
  return copy.sort((a, b) => Number(a.soldOut) - Number(b.soldOut));
}

export function readView(cookieHeader: string | null): View | null {
  const m = new RegExp(`(?:^|;\\s*)${VIEW_COOKIE}=(grid|large|shelf)`).exec(cookieHeader ?? "");
  return m ? (m[1] as View) : null;
}
