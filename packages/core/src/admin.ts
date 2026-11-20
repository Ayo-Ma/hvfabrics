import { z } from "zod";
import { add, zero, type Currency, type Money } from "./money";
import {
  LineSchema,
  ProductImageSchema,
  ProductSchema,
  ProductStatusSchema,
  UnitSchema,
  type Order,
  type OrderStatus,
  type Unit,
  type Variant,
} from "./schemas";
import { available } from "./stock";

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const AdminRoleSchema = z.enum(["owner", "manager", "packer"]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

/**
 * What each role may do in the dashboard. Packers see orders and print slips;
 * owners and managers also manage products, stock and see money in.
 */
export const ROLE_CAN = {
  orders: ["owner", "manager", "packer"],
  products: ["owner", "manager"],
  takings: ["owner", "manager"],
  /** Cancelling a paid order means giving money back: the owner alone (questionnaire Q63). */
  refunds: ["owner"],
  /** Confirming a bank transfer arrived (or that it never did). */
  payments: ["owner", "manager"],
} as const satisfies Record<string, readonly AdminRole[]>;

export function roleCan(role: AdminRole, what: keyof typeof ROLE_CAN): boolean {
  return (ROLE_CAN[what] as readonly AdminRole[]).includes(role);
}

/* ------------------------------------------------------------------ */
/* Dashboard inputs (validated by the Worker)                          */
/* ------------------------------------------------------------------ */

const qty = z.number().int().nonnegative().max(1_000_000);

export const VariantInputSchema = z.object({
  /** Stable suffix of the variant id (`<productId>--<key>`). */
  key: z.string().regex(/^[a-z0-9]{1,24}$/, "letters and digits only"),
  sku: z.string().trim().min(1).max(64),
  options: z.object({
    colour: z.string().trim().max(60).optional(),
    size: z.string().trim().max(30).optional(),
    unit: UnitSchema,
  }),
  price: z.object({ amount: z.number().int().positive().max(1_000_000_000_00), currency: z.literal("NGN") }),
  stock: qty,
  lowStockAt: qty,
});
export type VariantInput = z.infer<typeof VariantInputSchema>;

export const ProductInputSchema = z
  .object({
    slug: ProductSchema.shape.slug,
    line: LineSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().max(5000),
    images: z.array(ProductImageSchema).max(12),
    attributes: ProductSchema.shape.attributes,
    status: ProductStatusSchema,
    variants: z.array(VariantInputSchema).min(1).max(50),
  })
  .refine((p) => new Set(p.variants.map((v) => v.key)).size === p.variants.length, {
    message: "Two variants share a key",
    path: ["variants"],
  });
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const StockPatchSchema = z
  .object({ stock: qty.optional(), lowStockAt: qty.optional() })
  .refine((p) => p.stock !== undefined || p.lowStockAt !== undefined, "Nothing to change");
export type StockPatch = z.infer<typeof StockPatchSchema>;

/** Moves the orders board can make. Payment states belong to the Worker. */
export const BoardStatusSchema = z.enum(["paid", "packed", "shipped", "delivered"]);

export const OrderMoveSchema = z.object({ to: BoardStatusSchema });

export const RefundInputSchema = z.object({
  /** Put the items back on the shelf. Off when the fabric has already been cut. */
  restock: z.boolean(),
  reference: z.string().trim().max(80).optional(),
  reason: z.string().trim().max(200).optional(),
});
export type RefundInput = z.infer<typeof RefundInputSchema>;

export const PushTokenSchema = z.object({ token: z.string().min(20).max(4096) });

/** "Emerald Sequin Lace!" → "emerald-sequin-lace" */
export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "") || "product"
  );
}

/* ------------------------------------------------------------------ */
/* Board columns                                                       */
/* ------------------------------------------------------------------ */

/** The board's words for order states: New → Packed → Sent. */
export const BOARD_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "New",
  packed: "Packed",
  shipped: "Sent",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Orders whose money counts as "in". */
export const COUNTED_STATUSES: readonly OrderStatus[] = ["paid", "packed", "shipped", "delivered"];

/* ------------------------------------------------------------------ */
/* Takings: money in today, this week, this month, in her time zone    */
/* ------------------------------------------------------------------ */

const partsCache = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** Local calendar day and hour of an instant in `timeZone`. */
export function localParts(at: Date | string, timeZone: string): { day: string; hour: number } {
  const parts = fmt(timeZone).formatToParts(typeof at === "string" ? new Date(at) : at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** "2026-11-13" plus n days. Calendar maths on the date itself, so time zones can't shift it. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6. */
export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

function daysInMonth(day: string): number {
  const [y, m] = day.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export interface Bucket {
  /** "2026-11-13" for days, "14" for hours. */
  key: string;
  total: Money;
  orders: number;
}

export interface Takings {
  currency: Currency;
  timeZone: string;
  today: string;
  weekStart: string;
  monthStart: string;
  totals: { today: Money; week: Money; month: Money };
  orders: { today: number; week: number; month: number };
  /** Today by hour, 00–23. */
  hours: Bucket[];
  /** This week Monday–Sunday (days after today are empty, not zero-filled into the future). */
  week: Bucket[];
  /** This month, day 1 to the last day. */
  month: Bucket[];
}

/** Money in by period. Weeks start on Monday. Only orders that were paid count; cancelled never do. */
export function takings(orders: readonly Order[], now: Date, timeZone: string, currency: Currency = "NGN"): Takings {
  const { day: today } = localParts(now, timeZone);
  const weekStart = addDays(today, -weekday(today));
  const monthStart = `${today.slice(0, 8)}01`;

  const empty = (key: string): Bucket => ({ key, total: zero(currency), orders: 0 });
  const hours = Array.from({ length: 24 }, (_, h) => empty(String(h).padStart(2, "0")));
  const week = Array.from({ length: 7 }, (_, i) => empty(addDays(weekStart, i)));
  const month = Array.from({ length: daysInMonth(today) }, (_, i) => empty(addDays(monthStart, i)));
  const byDay = new Map([...week, ...month].map((b) => [b.key, [] as Bucket[]]));
  for (const b of week) byDay.get(b.key)!.push(b);
  for (const b of month) byDay.get(b.key)!.push(b);

  const totals = { today: zero(currency), week: zero(currency), month: zero(currency) };
  const counts = { today: 0, week: 0, month: 0 };

  for (const o of orders) {
    if (!o.paidAt || !COUNTED_STATUSES.includes(o.status) || o.totals.total.currency !== currency) continue;
    const { day, hour } = localParts(o.paidAt, timeZone);
    const amount = o.totals.total;
    for (const b of byDay.get(day) ?? []) {
      b.total = add(b.total, amount);
      b.orders++;
    }
    if (day === today) {
      const h = hours[hour]!;
      h.total = add(h.total, amount);
      h.orders++;
      totals.today = add(totals.today, amount);
      counts.today++;
    }
    if (day >= weekStart && day <= today) {
      totals.week = add(totals.week, amount);
      counts.week++;
    }
    if (day >= monthStart && day <= today) {
      totals.month = add(totals.month, amount);
      counts.month++;
    }
  }
  return { currency, timeZone, today, weekStart, monthStart, totals, orders: counts, hours, week, month };
}

/* ------------------------------------------------------------------ */
/* Cutting list: what to cut or pick for every order still to pack     */
/* ------------------------------------------------------------------ */

export interface CutLine {
  variantId: string;
  title: string;
  variantLabel: string;
  unit?: Unit;
  qty: number;
  /** Order numbers that need it, oldest first. */
  orders: string[];
}

/** Adds up the items of every New order, so she cuts each fabric once. Biggest cut first. */
export function cuttingList(orders: readonly Order[]): CutLine[] {
  const lines = new Map<string, CutLine>();
  const toPack = orders
    .filter((o) => o.status === "paid")
    .sort((a, b) => (a.paidAt ?? a.createdAt).localeCompare(b.paidAt ?? b.createdAt));
  for (const o of toPack) {
    for (const i of o.items) {
      const line = lines.get(i.variantId) ?? {
        variantId: i.variantId,
        title: i.title,
        variantLabel: i.variantLabel,
        ...(i.unit ? { unit: i.unit } : {}),
        qty: 0,
        orders: [],
      };
      line.qty += i.qty;
      if (!line.orders.includes(o.number)) line.orders.push(o.number);
      lines.set(i.variantId, line);
    }
  }
  return [...lines.values()].sort((a, b) => b.qty - a.qty || a.title.localeCompare(b.title));
}

/* ------------------------------------------------------------------ */
/* Stock                                                               */
/* ------------------------------------------------------------------ */

export type StockState = "sold_out" | "low" | "ok";

export function stockState(v: Pick<Variant, "stock" | "reserved" | "lowStockAt">): StockState {
  const a = available(v);
  if (a === 0) return "sold_out";
  return a <= v.lowStockAt ? "low" : "ok";
}
