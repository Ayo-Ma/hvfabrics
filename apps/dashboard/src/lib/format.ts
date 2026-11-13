import { formatMoney, unitLabel, type Money, type OrderItem } from "@hv/core";
import { TIME_ZONE } from "./config";

export { formatMoney };

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fullFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const longDay = (d: Date | string) => dayFmt.format(new Date(d));
export const shortDay = (d: Date | string) => shortFmt.format(new Date(d));
export const clock = (d: Date | string) => timeFmt.format(new Date(d));
export const dateTime = (d: Date | string) => fullFmt.format(new Date(d));

/** "4 min ago", "3 h ago", "Yesterday 14:20", "12 Nov" — recency in words (app rules §7.4). */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return `Yesterday ${clock(iso)}`;
  return shortDay(iso);
}

/** "5 yards", "1 piece"; items made before units were stored just say "× 5". */
export function qtyText(item: Pick<OrderItem, "qty" | "unit">): string {
  return item.unit ? `${item.qty} ${unitLabel(item.unit, item.qty)}` : `× ${item.qty}`;
}

/** ₦ without kobo when whole (most prices), with kobo otherwise. */
export const money = (m: Money) => formatMoney(m);

/** "₦45,000" → 4_500_000 kobo. Accepts commas and an optional ₦; null if it isn't a price. */
export function parseNaira(input: string): number | null {
  const clean = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** 4_500_000 → "45000" (for an input's value; no separators while editing). */
export function nairaInput(kobo: number): string {
  return kobo % 100 === 0 ? String(kobo / 100) : (kobo / 100).toFixed(2);
}
