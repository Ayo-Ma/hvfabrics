import { describe, expect, it } from "vitest";
import { canTransition, MIN_YARDS, MinimumQuantityError, minQty, newOrderNumber, priceOrder, type PricingVariant } from "./order";
import { CheckoutInputSchema, type DeliveryZone } from "./schemas";
import { seedCatalogue } from "./seed";

const zone: DeliveryZone = { id: "lagos", name: "Lagos", fee: { amount: 300_000, currency: "NGN" }, eta: "1–2 days" };
const variants = new Map<string, PricingVariant>([
  ["lace--5", { id: "lace--5", productId: "lace", title: "Lace", variantLabel: "Gold", price: { amount: 1_000_000, currency: "NGN" } }],
  ["bra--m", { id: "bra--m", productId: "bra", title: "Bra", variantLabel: "M", price: { amount: 1_250_050, currency: "NGN" } }],
  ["silk--y", { id: "silk--y", productId: "silk", title: "Silk", variantLabel: "Ivory", unit: "yard", price: { amount: 900_000, currency: "NGN" } }],
  ["damask--b", { id: "damask--b", productId: "damask", title: "Damask", variantLabel: "Gold", unit: "bundle", price: { amount: 5_000_000, currency: "NGN" } }],
]);

describe("priceOrder", () => {
  it("prices lines on the server and adds delivery", () => {
    const r = priceOrder(
      [
        { variantId: "lace--5", qty: 5 },
        { variantId: "bra--m", qty: 2 },
      ],
      variants,
      zone,
    );
    expect(r.items).toHaveLength(2);
    expect(r.totals.subtotal.amount).toBe(5_000_000 + 2_500_100);
    expect(r.totals.delivery.amount).toBe(300_000);
    expect(r.totals.total.amount).toBe(7_800_100);
    expect(r.currency).toBe("NGN");
  });

  it("rejects empty bags, unknown variants and mixed currencies", () => {
    expect(() => priceOrder([], variants, zone)).toThrow(RangeError);
    expect(() => priceOrder([{ variantId: "x", qty: 1 }], variants, zone)).toThrow(RangeError);
    const usdZone = { ...zone, fee: { amount: 0, currency: "USD" as const } };
    expect(() => priceOrder([{ variantId: "lace--5", qty: 1 }], variants, usdZone)).toThrow(TypeError);
  });
});

describe("minimum quantities", () => {
  it("cuts yard fabric from 2 yards; bundles and pieces from 1", () => {
    expect(MIN_YARDS).toBe(2);
    expect(minQty("yard")).toBe(2);
    expect(minQty("bundle")).toBe(1);
    expect(minQty("piece")).toBe(1);
    expect(minQty(undefined)).toBe(1);
  });

  it("refuses a yard line under the minimum and accepts it at the minimum", () => {
    expect(() => priceOrder([{ variantId: "silk--y", qty: 1 }], variants, zone)).toThrow(MinimumQuantityError);
    expect(priceOrder([{ variantId: "silk--y", qty: 2 }], variants, zone).totals.subtotal.amount).toBe(1_800_000);
    expect(priceOrder([{ variantId: "damask--b", qty: 1 }], variants, zone).totals.subtotal.amount).toBe(5_000_000);
  });

  it("names the fabric and the minimum in the error", () => {
    try {
      priceOrder([{ variantId: "silk--y", qty: 1 }], variants, zone);
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
      expect(e).toMatchObject({ title: "Silk", min: 2 });
    }
  });
});

describe("newOrderNumber", () => {
  it("uses the unambiguous alphabet", () => {
    const n = newOrderNumber(() => new Uint8Array([0, 1, 30, 31, 62, 255]));
    expect(n).toMatch(/^HV-[2-9A-HJKMNP-Z]{6}$/);
    expect(n).toBe("HV-23Z229");
  });
  it("is random by default", () => {
    expect(newOrderNumber()).not.toBe(newOrderNumber());
  });
});

describe("canTransition", () => {
  it("follows New → Packed → Sent", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("paid", "packed")).toBe(true);
    expect(canTransition("packed", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("paid", "shipped")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "paid")).toBe(false);
  });
});

describe("CheckoutInputSchema", () => {
  const valid = {
    items: [{ variantId: "lace--5", qty: 5 }],
    customer: { name: "Ada", email: "ada@example.com", phone: "0803 123 4567" },
    delivery: { zoneId: "lagos", address: "12 Example Street", city: "Ikeja", state: "Lagos" },
  };
  it("accepts a valid checkout and normalises the phone", () => {
    const r = CheckoutInputSchema.parse(valid);
    expect(r.customer.phone).toBe("08031234567");
  });
  it("rejects bad input", () => {
    expect(CheckoutInputSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(CheckoutInputSchema.safeParse({ ...valid, items: [{ variantId: "a--1", qty: 0 }] }).success).toBe(false);
    expect(CheckoutInputSchema.safeParse({ ...valid, customer: { ...valid.customer, phone: "123" } }).success).toBe(false);
    expect(CheckoutInputSchema.safeParse({ ...valid, customer: { ...valid.customer, email: "x" } }).success).toBe(false);
  });
});

describe("seed catalogue", () => {
  it("is all placeholders, with sold-out cases and no stock counts", () => {
    const c = seedCatalogue();
    expect(c.products.length).toBeGreaterThan(0);
    expect(c.products.every((p) => p.placeholder && p.title.startsWith("[TBC]"))).toBe(true);
    expect(c.products.some((p) => p.soldOut)).toBe(true);
    expect(c.products.flatMap((p) => p.variants).every((v) => v.available === 0 || v.available === 100)).toBe(true);
  });
});
