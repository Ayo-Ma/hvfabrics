/**
 * Money is always an integer in the currency's smallest unit (kobo, cents)
 * plus a currency code. Never use floating point for money.
 */

export const CURRENCIES = {
  NGN: { symbol: "₦", minorPerMajor: 100 },
  USD: { symbol: "$", minorPerMajor: 100 },
} as const;

export type Currency = keyof typeof CURRENCIES;

export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer, got ${value}`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function money(amount: number, currency: Currency): Money {
  assertInteger(amount, "amount");
  return { amount, currency };
}

export function zero(currency: Currency): Money {
  return { amount: 0, currency };
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(m: Money, quantity: number): Money {
  assertInteger(quantity, "quantity");
  return money(m.amount * quantity, m.currency);
}

export function sum(items: readonly Money[], currency: Currency): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.amount === b.amount ? 0 : a.amount < b.amount ? -1 : 1;
}

/** Integer division rounding half away from zero, done in BigInt so it never loses precision. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (d * 2n);
  return negative ? -q : q;
}

/** A percentage of an amount, in basis points (150 = 1.5%), rounded half up to the minor unit. */
export function percentOf(m: Money, basisPoints: number): Money {
  assertInteger(basisPoints, "basisPoints");
  const result = divRound(BigInt(m.amount) * BigInt(basisPoints), 10_000n);
  return money(Number(result), m.currency);
}

/** Parse a decimal string in major units ("1500", "1,500.50") into minor units. Rejects floats with too many decimals. */
export function fromMajor(input: string, currency: Currency): Money {
  const cleaned = input.trim().replace(/,/g, "");
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) throw new RangeError(`Not a valid ${currency} amount: "${input}"`);
  const [, sign, whole, fraction = ""] = match;
  const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  const value = Number(sign ? -minor : minor);
  return money(value, currency);
}

/** Major units as a plain string with two decimals, e.g. "1500.50". */
export function toMajorString(m: Money): string {
  const abs = Math.abs(m.amount);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${m.amount < 0 ? "-" : ""}${whole}.${fraction}`;
}

const grouping = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Display format: "₦45,000" or "₦45,000.50". Hides ".00" by default.
 * Built by hand so the ₦ sign never depends on the browser's locale data.
 */
export function formatMoney(m: Money, options: { showMinor?: "auto" | "always" } = {}): string {
  const { symbol } = CURRENCIES[m.currency];
  const abs = Math.abs(m.amount);
  const whole = grouping.format(Math.floor(abs / 100));
  const minor = abs % 100;
  const showMinor = options.showMinor === "always" || minor !== 0;
  const fraction = showMinor ? `.${String(minor).padStart(2, "0")}` : "";
  return `${m.amount < 0 ? "−" : ""}${symbol}${whole}${fraction}`;
}

/**
 * Paystack's local card fee (PLAN.md, Running cost):
 * 1.5% + ₦100, the ₦100 waived under ₦2,500, capped at ₦2,000.
 * Used for net-revenue figures on the dashboard; not charged to the customer.
 */
export function paystackLocalFee(m: Money): Money {
  if (m.currency !== "NGN") throw new TypeError("paystackLocalFee is for NGN only");
  const flat = m.amount < 250_000 ? 0 : 10_000;
  const fee = percentOf(m, 150).amount + flat;
  return money(Math.min(fee, 200_000), "NGN");
}
