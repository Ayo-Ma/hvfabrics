import { describe, expect, it } from "vitest";
import type { CatalogueProduct } from "./catalogue";
import { buildSearchIndex, editDistance, normalise, search } from "./search";

function product(id: string, title: string, line: CatalogueProduct["line"], extra: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id,
    slug: id,
    line,
    title,
    description: "",
    images: [],
    attributes: {},
    variants: [],
    fromPrice: { amount: 100, currency: "NGN" },
    soldOut: false,
    createdAt: "2026-11-12T00:00:00Z",
    ...extra,
  };
}

const index = buildSearchIndex(
  [
    product("lace", "Emerald Sequin Lace", "fabric", { attributes: { fibre: "Polyester" } }),
    product("ankara", "Sunrise Ankara", "fabric"),
    product("wax", "Blue Wax Print", "fabric"),
    product("bralette", "Ivory Lace Bralette", "lingerie"),
    product("gown", "Evening Gown", "rtw"),
  ],
  "v1",
);

const ids = (q: string) => search(index, q).map((h) => h.doc.id);

describe("search", () => {
  it("normalises case and accents", () => {
    expect(normalise("Émerald  LACE!")).toBe("emerald lace");
  });

  it("finds exact and prefix matches", () => {
    expect(ids("emerald")).toEqual(["lace"]);
    expect(ids("sequ")).toEqual(["lace"]);
  });

  it("ranks title matches above other fields", () => {
    expect(ids("lace")[0]).toBe("lace");
    expect(ids("lace")).toContain("bralette");
  });

  it("tolerates typos", () => {
    expect(ids("emrald")).toEqual(["lace"]);
    expect(ids("sequin lcae")).toEqual(["lace"]);
  });

  it("applies synonyms: ankara = wax print, bra = lingerie", () => {
    expect(ids("ankara").sort()).toEqual(["ankara", "wax"]);
    expect(ids("wax print").sort()).toEqual(["ankara", "wax"]);
    expect(ids("bra")).toContain("bralette");
  });

  it("requires every term to match", () => {
    expect(ids("emerald gown")).toEqual([]);
    expect(ids("")).toEqual([]);
  });

  it("searches by line name", () => {
    expect(ids("ready to wear")).toEqual(["gown"]);
  });
});

describe("editDistance", () => {
  it("counts transpositions as one edit", () => {
    expect(editDistance("lcae", "lace")).toBe(1);
    expect(editDistance("abc", "abc")).toBe(0);
    expect(editDistance("a", "abcd", 2)).toBe(3);
  });
});
