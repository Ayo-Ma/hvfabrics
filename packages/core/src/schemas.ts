import { z } from "zod";

// No runtime code generation: zod otherwise probes `new Function`, which the shop's
// Content-Security-Policy (and Cloudflare Workers) forbid. Same results, no eval attempt.
z.config({ jitless: true });

/** Firestore data model from PLAN.md. Every API input and stored document is validated with these. */

export const LINES = ["fabric", "lingerie", "rtw"] as const;
export const LineSchema = z.enum(LINES);
export type Line = z.infer<typeof LineSchema>;

export const LINE_LABELS: Record<Line, string> = {
  fabric: "Fabrics",
  lingerie: "Lingerie",
  rtw: "Ready-to-Wear",
};

export const CurrencySchema = z.enum(["NGN", "USD"]);

export const MoneySchema = z.object({
  amount: z.number().int(),
  currency: CurrencySchema,
});

const isoDate = z.iso.datetime({ offset: false });
const id = z.string().min(1).max(128);
const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words separated by hyphens");

export const ProductImageSchema = z.object({
  /** R2 key prefix; sizes 400/800/1200/2000 in AVIF and WebP live under it. */
  key: z.string().min(1),
  alt: z.string().min(1).max(250),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

export const ProductStatusSchema = z.enum(["draft", "live", "archived"]);

export const ProductSchema = z.object({
  id,
  slug,
  line: LineSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(5000),
  images: z.array(ProductImageSchema).max(12),
  attributes: z.object({
    fibre: z.string().max(120).optional(),
    width: z.string().max(60).optional(),
    care: z.string().max(500).optional(),
  }),
  status: ProductStatusSchema,
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Product = z.infer<typeof ProductSchema>;

/**
 * Unit: PLAN.md lists yard and bundle. "piece" is added for lingerie and
 * ready-to-wear sold by the item — to be confirmed by Malik.
 */
export const UnitSchema = z.enum(["yard", "bundle", "piece"]);
export type Unit = z.infer<typeof UnitSchema>;

/**
 * Variant ids are `<productId>--<key>`, so the server can find the Firestore path
 * products/{productId}/variants/{variantId} from a bag line alone.
 */
export const variantIdSchema = z
  .string()
  .min(4)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+--[A-Za-z0-9_-]+$/, "variant id must be <productId>--<key>");

export function productIdOfVariant(variantId: string): string {
  const i = variantId.lastIndexOf("--");
  if (i <= 0) throw new RangeError(`Malformed variant id ${variantId}`);
  return variantId.slice(0, i);
}

export const VariantSchema = z.object({
  id: variantIdSchema,
  sku: z.string().min(1).max(64),
  options: z.object({
    colour: z.string().max(60).optional(),
    size: z.string().max(30).optional(),
    unit: UnitSchema,
  }),
  price: MoneySchema,
  stock: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  lowStockAt: z.number().int().nonnegative(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const OrderStatusSchema = z.enum([
  "pending",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSchema = z.object({
  productId: id,
  variantId: id,
  title: z.string(),
  variantLabel: z.string(),
  /** How it's sold, so the cutting list can say "5 yards". Absent on orders made before 2026-11-13. */
  unit: UnitSchema.optional(),
  qty: z.number().int().positive(),
  unitPrice: MoneySchema,
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id,
  number: z.string(),
  customer: z.object({ name: z.string(), email: z.email(), phone: z.string() }),
  items: z.array(OrderItemSchema).min(1),
  delivery: z.object({ zone: z.string(), address: z.string(), fee: MoneySchema }),
  totals: z.object({ subtotal: MoneySchema, delivery: MoneySchema, total: MoneySchema }),
  currency: CurrencySchema,
  status: OrderStatusSchema,
  paystackRef: z.string().optional(),
  reservedUntil: isoDate.optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  createdAt: isoDate,
  paidAt: isoDate.optional(),
  packedAt: isoDate.optional(),
  shippedAt: isoDate.optional(),
  deliveredAt: isoDate.optional(),
  cancelledAt: isoDate.optional(),
  /** Needs her attention, e.g. "paid_after_expiry_stock_short" (payment arrived after the hold expired and stock ran out). */
  flags: z.array(z.string()).optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const CustomerSchema = z.object({
  id,
  email: z.email(),
  phone: z.string(),
  name: z.string(),
  country: z.string().optional(),
  ordersCount: z.number().int().nonnegative(),
  totalSpent: MoneySchema,
  firstOrderAt: isoDate,
  lastOrderAt: isoDate,
  tags: z.array(z.string()),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const DailyStatsSchema = z.object({
  date: z.iso.date(),
  revenue: MoneySchema,
  orders: z.number().int().nonnegative(),
  avgOrderValue: MoneySchema,
  byLine: z.record(LineSchema, MoneySchema),
  byCountry: z.record(z.string(), z.number().int().nonnegative()),
  topProducts: z.array(z.object({ productId: id, title: z.string(), units: z.number().int() })),
});
export type DailyStats = z.infer<typeof DailyStatsSchema>;

export const DeliveryZoneSchema = z.object({
  id,
  name: z.string(),
  fee: MoneySchema,
  /** Shown to the customer, e.g. "2–4 working days". [TBC] until confirmed. */
  eta: z.string(),
});
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;

export const SettingsSchema = z.object({
  deliveryZones: z.array(DeliveryZoneSchema),
  storeAddress: z.string(),
  policies: z.object({ delivery: z.string(), returns: z.string(), privacy: z.string() }),
  notificationTargets: z.object({ emails: z.array(z.email()), pushTokens: z.array(z.string()) }),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const AdminSchema = z.object({
  uid: id,
  role: z.enum(["owner", "manager", "packer"]),
});
export type Admin = z.infer<typeof AdminSchema>;

/* ---------------- API inputs ---------------- */

/** Nigerian numbers (0803…, +234803…) and international numbers with a + prefix. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(\+\d{8,15}|0\d{10})$/, "Enter a valid phone number"));

export const BagLineSchema = z.object({
  variantId: variantIdSchema,
  qty: z.number().int().min(1).max(100),
});
export type BagLine = z.infer<typeof BagLineSchema>;

export const CheckoutInputSchema = z.object({
  items: z.array(BagLineSchema).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    phone,
  }),
  delivery: z.object({
    zoneId: id,
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
  }),
  source: z.string().max(80).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export const TrackOrderInputSchema = z.object({
  number: z.string().trim().min(3).max(32),
  email: z.email(),
});
