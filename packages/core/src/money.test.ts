import { describe, expect, it } from "vitest";
import {
  add,
  compare,
  equals,
  formatMoney,
  fromMajor,
  money,
  multiply,
  paystackLocalFee,
  percentOf,
  subtract,
  sum,
  toMajorString,
  zero,
} from "./money";

describe("money", () => {
  it("only accepts integers", () => {
    expect(() => money(10.5, "NGN")).toThrow(RangeError);
    expect(() => money(Number.MAX_SAFE_INTEGER + 2, "NGN")).toThrow(RangeError);
    expect(money(100, "NGN")).toEqual({ amount: 100, currency: "NGN" });
  });

  it("adds, subtracts and sums in the same currency", () => {
    expect(add(money(150, "NGN"), money(250, "NGN")).amount).toBe(400);
    expect(subtract(money(150, "NGN"), money(250, "NGN")).amount).toBe(-100);
    expect(sum([money(1, "NGN"), money(2, "NGN"), money(3, "NGN")], "NGN").amount).toBe(6);
    expect(sum([], "USD")).toEqual(zero("USD"));
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(1, "NGN"), money(1, "USD"))).toThrow(TypeError);
    expect(() => compare(money(1, "NGN"), money(1, "USD"))).toThrow(TypeError);
  });

  it("multiplies by integer quantities only", () => {
    expect(multiply(money(4_500_000, "NGN"), 5).amount).toBe(22_500_000);
    expect(() => multiply(money(100, "NGN"), 1.5)).toThrow(RangeError);
  });

  it("compares and checks equality", () => {
    expect(compare(money(1, "NGN"), money(2, "NGN"))).toBe(-1);
    expect(compare(money(2, "NGN"), money(2, "NGN"))).toBe(0);
    expect(compare(money(3, "NGN"), money(2, "NGN"))).toBe(1);
    expect(equals(money(2, "NGN"), money(2, "NGN"))).toBe(true);
    expect(equals(money(2, "NGN"), money(2, "USD"))).toBe(false);
  });

  it("takes percentages with half-up rounding", () => {
    expect(percentOf(money(10_000, "NGN"), 150).amount).toBe(150);
    expect(percentOf(money(1, "NGN"), 5_000).amount).toBe(1); // 0.5 rounds up
    expect(percentOf(money(3, "NGN"), 5_000).amount).toBe(2); // 1.5 rounds up
    expect(percentOf(money(-3, "NGN"), 5_000).amount).toBe(-2); // away from zero
  });

  it("parses major-unit strings without floats", () => {
    expect(fromMajor("1500", "NGN").amount).toBe(150_000);
    expect(fromMajor("1,500.5", "NGN").amount).toBe(150_050);
    expect(fromMajor("0.07", "NGN").amount).toBe(7);
    expect(fromMajor("-2.10", "USD").amount).toBe(-210);
    expect(() => fromMajor("1.234", "NGN")).toThrow(RangeError);
    expect(() => fromMajor("abc", "NGN")).toThrow(RangeError);
  });

  it("prints major strings", () => {
    expect(toMajorString(money(150_050, "NGN"))).toBe("1500.50");
    expect(toMajorString(money(-7, "NGN"))).toBe("-0.07");
  });

  it("formats for display with the right symbol", () => {
    expect(formatMoney(money(4_500_000, "NGN"))).toBe("₦45,000");
    expect(formatMoney(money(4_500_050, "NGN"))).toBe("₦45,000.50");
    expect(formatMoney(money(4_500_000, "NGN"), { showMinor: "always" })).toBe("₦45,000.00");
    expect(formatMoney(money(1999, "USD"))).toBe("$19.99");
    expect(formatMoney(money(-500, "NGN"))).toBe("−₦5");
  });
});

describe("paystackLocalFee", () => {
  it("waives the ₦100 under ₦2,500", () => {
    expect(paystackLocalFee(money(200_000, "NGN")).amount).toBe(3_000); // 1.5% of ₦2,000 = ₦30
  });
  it("adds ₦100 from ₦2,500", () => {
    expect(paystackLocalFee(money(250_000, "NGN")).amount).toBe(3_750 + 10_000);
  });
  it("caps at ₦2,000", () => {
    expect(paystackLocalFee(money(50_000_000, "NGN")).amount).toBe(200_000);
  });
  it("is NGN only", () => {
    expect(() => paystackLocalFee(money(100, "USD"))).toThrow(TypeError);
  });
});
