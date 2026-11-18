import { buildCatalogue, type Catalogue } from "./catalogue";
import type { Line, Product, Settings, Unit, Variant } from "./schemas";

/**
 * LOCAL DEVELOPMENT ONLY. Placeholder products so the storefront can be built
 * before real products exist. Titles, prices and stock are not real: every
 * title starts with [TBC] and every product carries `placeholder: true`.
 * The Worker refuses to serve this catalogue when ENVIRONMENT=production.
 */

const T = "2026-11-12T09:00:00Z";

interface SeedSpec {
  line: Line;
  n: number;
  unit: Unit;
  variants: { colour?: string; size?: string; price: number; stock: number; reserved?: number }[];
}

const specs: SeedSpec[] = [
  { line: "fabric", n: 1, unit: "yard", variants: [{ colour: "Colour A", price: 1_000_000, stock: 40 }, { colour: "Colour B", price: 1_000_000, stock: 3 }] },
  { line: "fabric", n: 2, unit: "yard", variants: [{ colour: "Colour A", price: 1_500_000, stock: 25 }] },
  { line: "fabric", n: 3, unit: "bundle", variants: [{ colour: "Colour A", price: 5_000_000, stock: 0 }] },
  { line: "fabric", n: 4, unit: "yard", variants: [{ colour: "Colour A", price: 800_000, stock: 60 }, { colour: "Colour B", price: 800_000, stock: 12 }] },
  { line: "lingerie", n: 1, unit: "piece", variants: [{ size: "S", price: 1_200_000, stock: 5 }, { size: "M", price: 1_200_000, stock: 8 }, { size: "L", price: 1_200_000, stock: 0 }] },
  { line: "lingerie", n: 2, unit: "piece", variants: [{ size: "M", price: 1_800_000, stock: 2 }, { size: "L", price: 1_800_000, stock: 6 }] },
  { line: "lingerie", n: 3, unit: "piece", variants: [{ size: "One size", price: 900_000, stock: 15 }] },
  { line: "rtw", n: 1, unit: "piece", variants: [{ size: "8", price: 3_500_000, stock: 3 }, { size: "10", price: 3_500_000, stock: 4 }, { size: "12", price: 3_500_000, stock: 1 }] },
  { line: "rtw", n: 2, unit: "piece", variants: [{ size: "10", price: 4_200_000, stock: 0 }, { size: "12", price: 4_200_000, stock: 0 }] },
  { line: "rtw", n: 3, unit: "piece", variants: [{ size: "8", price: 2_800_000, stock: 9 }, { size: "14", price: 2_800_000, stock: 9 }] },
];

const lineWord: Record<Line, string> = { fabric: "Fabric", lingerie: "Lingerie", rtw: "Ready-to-wear" };

/**
 * Generated design stand-ins (assets/photography/products, served by the storefront from /media) so
 * the local preview shows real-looking photographs. Never real stock: the seed is refused in production.
 */
const STANDINS: Partial<Record<string, { name: string; describe: string }>> = {
  "fabric-1": { name: "ivory-french-lace", describe: "ivory French lace" },
  "fabric-2": { name: "emerald-sequin-lace", describe: "emerald sequin lace" },
  "fabric-3": { name: "gold-damask", describe: "gold damask" },
  "fabric-4": { name: "coral-beaded-lace", describe: "coral beaded lace" },
  "rtw-1": { name: "black-wrap-midi", describe: "black wrap midi dress" },
  "rtw-2": { name: "ivory-linen-coord", describe: "ivory linen co-ord" },
};
const VIEWS = [
  ["01-front", "front"],
  ["02-drape", "draped"],
  ["03-macro", "close-up of the texture"],
] as const;

function seedImages(line: Line, n: number): Product["images"] {
  const s = STANDINS[`${line}-${n}`];
  if (!s) {
    return [
      { key: "placeholder/product", alt: `[TBC] ${lineWord[line]} sample ${n}, front`, width: 1600, height: 2000 },
      { key: "placeholder/product", alt: `[TBC] ${lineWord[line]} sample ${n}, detail`, width: 1600, height: 2000 },
    ];
  }
  return VIEWS.map(([file, view]) => ({ key: `standin/products/${line}/${s.name}/${file}`, alt: `${s.describe}, ${view}`, width: 1122, height: 1402 }));
}

export const seedEntries: { product: Product; variants: Variant[]; placeholder: true }[] = specs.map((s, i) => {
  const id = `seed-${s.line}-${s.n}`;
  const created = new Date(Date.parse(T) - i * 3_600_000).toISOString().replace(".000", "");
  return {
    placeholder: true,
    product: {
      id,
      slug: `${s.line}-sample-${s.n}`,
      line: s.line,
      title: `[TBC] ${lineWord[s.line]} sample ${s.n}`,
      description: "[TBC: product description from Harries Vogue]",
      images: seedImages(s.line, s.n),
      attributes: s.line === "fabric" ? { fibre: "[TBC]", width: "[TBC]", care: "[TBC: care instructions]" } : { care: "[TBC: care instructions]" },
      status: "live",
      createdAt: created,
      updatedAt: created,
    },
    variants: s.variants.map((v, j) => ({
      id: `${id}--v${j + 1}`,
      sku: `${id.toUpperCase()}-${j + 1}`,
      options: { unit: s.unit, ...(v.colour ? { colour: v.colour } : {}), ...(v.size ? { size: v.size } : {}) },
      price: { amount: v.price, currency: "NGN" },
      stock: v.stock,
      reserved: v.reserved ?? 0,
      lowStockAt: 3,
    })),
  };
});

export function seedCatalogue(now = new Date(T)): Catalogue {
  return buildCatalogue(seedEntries, now);
}

export const seedSettings: Settings = {
  deliveryZones: [
    { id: "lagos", name: "[TBC] Lagos", fee: { amount: 0, currency: "NGN" }, eta: "[TBC]" },
    { id: "nationwide", name: "[TBC] Rest of Nigeria", fee: { amount: 0, currency: "NGN" }, eta: "[TBC]" },
  ],
  storeAddress: "[TBC: shop address, Abule Egba, Lagos]",
  policies: {
    delivery: "[TBC: delivery policy]",
    returns: "[TBC: returns policy]",
    privacy: "[TBC: privacy policy]",
  },
  notificationTargets: { emails: [], pushTokens: [] },
};
