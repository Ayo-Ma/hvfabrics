import { describe, expect, it } from "vitest";
import {
  ProductInputSchema,
  addDays,
  cuttingList,
  localParts,
  roleCan,
  slugify,
  stockState,
  takings,
  weekday,
} from "./admin";
import { moveOrder } from "./order";
import type { Order, OrderStatus } from "./schemas";

const LAGOS = "Africa/Lagos"; // UTC+1, no daylight saving

function order(n: number, paidAt: string | undefined, amount: number, status: OrderStatus = "paid", items: Order["items"] = []): Order {
  return {
    id: `o${n}`,
    number: `HV-${String(n).padStart(6, "2")}`,
    customer: { name: "Ada", email: "ada@example.com", phone: "08031234567" },
    items: items.length
      ? items
      : [{ productId: "lace", variantId: "lace--gold", title: "Lace", variantLabel: "Gold", unit: "yard", qty: 1, unitPrice: { amount, currency: "NGN" } }],
    delivery: { zone: "Lagos", address: "x", fee: { amount: 0, currency: "NGN" } },
    totals: {
      subtotal: { amount, currency: "NGN" },
      delivery: { amount: 0, currency: "NGN" },
      total: { amount, currency: "NGN" },
    },
    currency: "NGN",
    status,
    createdAt: paidAt ?? "2026-11-13T08:00:00Z",
    ...(paidAt ? { paidAt } : {}),
  };
}

describe("calendar helpers", () => {
  it("reads the local day and hour in Lagos", () => {
    // 23:30 UTC on the 12th is 00:30 on the 13th in Lagos.
    expect(localParts("2026-11-12T23:30:00Z", LAGOS)).toEqual({ day: "2026-11-13", hour: 0 });
  });
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("starts weeks on Monday", () => {
    expect(weekday("2026-11-09")).toBe(0); // Monday
    expect(weekday("2026-11-15")).toBe(6); // Sunday
  });
});

describe("takings", () => {
  const now = new Date("2026-11-13T15:00:00Z"); // Friday 16:00 in Lagos
  const orders = [
    order(1, "2026-11-13T09:15:00Z", 4_500_000), // today 10:15
    order(2, "2026-11-12T23:30:00Z", 1_000_000, "packed"), // today 00:30 Lagos, yesterday in UTC
    order(3, "2026-11-10T12:00:00Z", 2_000_000, "shipped"), // Tuesday this week
    order(4, "2026-11-02T12:00:00Z", 3_000_000, "delivered"), // this month, last week
    order(5, "2026-10-31T12:00:00Z", 9_000_000, "delivered"), // last month
    order(6, "2026-11-13T10:00:00Z", 7_000_000, "cancelled"), // never counts
    order(7, undefined, 5_000_000, "pending"), // not paid
  ];
  const t = takings(orders, now, LAGOS);

  it("adds up today, this week and this month from the orders themselves", () => {
    expect(t.today).toBe("2026-11-13");
    expect(t.weekStart).toBe("2026-11-09");
    expect(t.totals.today.amount).toBe(5_500_000);
    expect(t.totals.week.amount).toBe(7_500_000);
    expect(t.totals.month.amount).toBe(10_500_000);
    expect(t.orders).toEqual({ today: 2, week: 3, month: 4 });
  });

  it("buckets agree with the totals", () => {
    const sumOf = (bs: { total: { amount: number } }[]) => bs.reduce((s, b) => s + b.total.amount, 0);
    expect(sumOf(t.hours)).toBe(t.totals.today.amount);
    expect(sumOf(t.week)).toBe(t.totals.week.amount);
    expect(sumOf(t.month)).toBe(t.totals.month.amount);
    expect(t.hours[0]!.total.amount).toBe(1_000_000);
    expect(t.hours[10]!.total.amount).toBe(4_500_000);
    expect(t.month).toHaveLength(30);
    expect(t.week.map((b) => b.key)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });

  it("prints a real zero for a day with no sales", () => {
    const quiet = takings([], now, LAGOS);
    expect(quiet.totals).toEqual({
      today: { amount: 0, currency: "NGN" },
      week: { amount: 0, currency: "NGN" },
      month: { amount: 0, currency: "NGN" },
    });
  });
});

describe("cuttingList", () => {
  const lace = (qty: number) => ({
    productId: "lace",
    variantId: "lace--gold",
    title: "Lace",
    variantLabel: "Gold",
    unit: "yard" as const,
    qty,
    unitPrice: { amount: 100, currency: "NGN" as const },
  });
  const bra = { ...lace(1), productId: "bra", variantId: "bra--m", title: "Bra", variantLabel: "M", unit: "piece" as const };

  it("adds the same fabric across New orders, biggest cut first, and skips packed ones", () => {
    const list = cuttingList([
      order(2, "2026-11-13T10:00:00Z", 1, "paid", [lace(5), bra]),
      order(1, "2026-11-13T09:00:00Z", 1, "paid", [lace(3)]),
      order(3, "2026-11-13T08:00:00Z", 1, "packed", [lace(9)]),
    ]);
    expect(list).toEqual([
      { variantId: "lace--gold", title: "Lace", variantLabel: "Gold", unit: "yard", qty: 8, orders: ["HV-222221", "HV-222222"] },
      { variantId: "bra--m", title: "Bra", variantLabel: "M", unit: "piece", qty: 1, orders: ["HV-222222"] },
    ]);
  });
});

describe("moveOrder", () => {
  const at = "2026-11-13T12:00:00Z";
  it("stamps each step forward", () => {
    const packed = moveOrder(order(1, at, 1), "packed", at);
    expect(packed).toMatchObject({ status: "packed", packedAt: at });
    expect(moveOrder(packed, "shipped", at)).toMatchObject({ status: "shipped", packedAt: at, shippedAt: at });
  });
  it("undoes one step and clears its stamp", () => {
    const packed = moveOrder(order(1, at, 1), "packed", at);
    const back = moveOrder(packed, "paid", at);
    expect(back.status).toBe("paid");
    expect(back).not.toHaveProperty("packedAt");
  });
  it("refuses skips and payment states", () => {
    expect(() => moveOrder(order(1, at, 1), "shipped", at)).toThrow(RangeError);
    expect(() => moveOrder(order(1, undefined, 1, "pending"), "paid", at)).toThrow(RangeError);
    expect(() => moveOrder(order(1, at, 1), "cancelled", at)).toThrow(RangeError);
  });
});

describe("product input", () => {
  const base = {
    slug: "emerald-lace",
    line: "fabric",
    title: "Emerald lace",
    description: "",
    images: [],
    attributes: {},
    status: "draft",
    variants: [{ key: "v1", sku: "EL-1", options: { unit: "yard" }, price: { amount: 1_000_000, currency: "NGN" }, stock: 10, lowStockAt: 3 }],
  };
  it("accepts a product from the form", () => {
    expect(ProductInputSchema.safeParse(base).success).toBe(true);
  });
  it("refuses duplicate variant keys, free prices and fractional stock", () => {
    const v = base.variants[0]!;
    expect(ProductInputSchema.safeParse({ ...base, variants: [v, v] }).success).toBe(false);
    expect(ProductInputSchema.safeParse({ ...base, variants: [{ ...v, price: { amount: 0, currency: "NGN" } }] }).success).toBe(false);
    expect(ProductInputSchema.safeParse({ ...base, variants: [{ ...v, stock: 2.5 }] }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("Émerald  Sequin Lace!")).toBe("emerald-sequin-lace");
    expect(slugify("!!!")).toBe("product");
  });
  it("knows what each role may do", () => {
    expect(roleCan("packer", "orders")).toBe(true);
    expect(roleCan("packer", "products")).toBe(false);
    expect(roleCan("manager", "takings")).toBe(true);
  });
  it("flags low and sold-out stock after holds", () => {
    expect(stockState({ stock: 5, reserved: 5, lowStockAt: 2 })).toBe("sold_out");
    expect(stockState({ stock: 5, reserved: 3, lowStockAt: 2 })).toBe("low");
    expect(stockState({ stock: 9, reserved: 0, lowStockAt: 2 })).toBe("ok");
  });
});
