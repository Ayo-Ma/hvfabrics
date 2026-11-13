import { describe, expect, it } from "vitest";
import {
  StockError,
  available,
  commitSale,
  release,
  reservationExpiry,
  reserve,
  validateBag,
} from "./stock";

const v = (id: string, stock: number, reserved = 0) => ({ id, stock, reserved });

describe("available", () => {
  it("is stock minus reserved, never negative", () => {
    expect(available(v("a", 10, 3))).toBe(7);
    expect(available(v("a", 2, 5))).toBe(0);
  });
});

describe("validateBag", () => {
  const variants = new Map([
    ["lace", v("lace", 10, 4)],
    ["gone", v("gone", 3, 3)],
  ]);

  it("passes when everything is available and merges duplicate lines", () => {
    const r = validateBag(
      [
        { variantId: "lace", qty: 2 },
        { variantId: "lace", qty: 3 },
      ],
      variants,
    );
    expect(r).toEqual({ ok: true, merged: [{ variantId: "lace", qty: 5 }] });
  });

  it("reports sold out, insufficient and unknown variants", () => {
    const r = validateBag(
      [
        { variantId: "lace", qty: 7 },
        { variantId: "gone", qty: 1 },
        { variantId: "nope", qty: 1 },
      ],
      variants,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.problems).toEqual([
        { variantId: "lace", kind: "insufficient", available: 6, requested: 7 },
        { variantId: "gone", kind: "sold_out" },
        { variantId: "nope", kind: "not_found" },
      ]);
    }
  });
});

describe("reserve / release / commitSale", () => {
  it("reserves only what is available", () => {
    expect(reserve(v("a", 5, 1), 4)).toEqual(v("a", 5, 5));
    expect(() => reserve(v("a", 5, 1), 5)).toThrow(StockError);
  });

  it("releases without going below zero", () => {
    expect(release(v("a", 5, 3), 2)).toEqual(v("a", 5, 1));
    expect(release(v("a", 5, 1), 4)).toEqual(v("a", 5, 0));
  });

  it("turns reserved units into sold units", () => {
    expect(commitSale(v("a", 5, 3), 3)).toEqual(v("a", 2, 0));
    expect(() => commitSale(v("a", 5, 1), 2)).toThrow(StockError);
  });

  it("rejects bad quantities", () => {
    for (const fn of [reserve, release, commitSale]) {
      expect(() => fn(v("a", 5, 5), 0)).toThrow(RangeError);
      expect(() => fn(v("a", 5, 5), 1.5)).toThrow(RangeError);
    }
  });

  it("never oversells the last units across many sequential buyers", () => {
    // Simulates the order Firestore transactions serialise into.
    let lace = v("lace", 5, 0);
    let sold = 0;
    for (let buyer = 0; buyer < 20; buyer++) {
      try {
        lace = reserve(lace, 1);
        lace = commitSale(lace, 1);
        sold++;
      } catch (e) {
        expect(e).toBeInstanceOf(StockError);
      }
    }
    expect(sold).toBe(5);
    expect(lace).toEqual(v("lace", 0, 0));
  });
});

describe("reservationExpiry", () => {
  it("is 15 minutes later", () => {
    const from = new Date("2026-11-12T10:00:00Z");
    expect(reservationExpiry(from).toISOString()).toBe("2026-11-12T10:15:00.000Z");
  });
});
