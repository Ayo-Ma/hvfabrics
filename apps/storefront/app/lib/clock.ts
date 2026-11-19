import { useEffect, useState } from "react";
import { SHOP } from "~/lib/shop";

/** The shop's day in Nigerian time: opening hours and the same-day dispatch cut-off. Computed after load. */

export const OPEN_MIN = 9 * 60; // 9am
export const CLOSE_MIN = 18 * 60; // 6pm
export const CUTOFF_MIN = 10 * 60; // pay before 10am, out the same day
// [TBC: open days] She gave hours only (Q4); the clock treats every day as open until she says otherwise.

export function lagosMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function useLagosClock(): number | null {
  const [mins, setMins] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMins(lagosMinutes());
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);
  return mins;
}

export const span = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`);

export function shopStatus(mins: number | null): { open: boolean | null; text: string } {
  if (mins === null) return { open: null, text: `Open ${SHOP.hours}` };
  if (mins >= OPEN_MIN && mins < CLOSE_MIN) return { open: true, text: `Open now · closes in ${span(CLOSE_MIN - mins)}` };
  const until = mins < OPEN_MIN ? OPEN_MIN - mins : 24 * 60 - mins + OPEN_MIN;
  return { open: false, text: `Closed · opens at 9am, in ${span(until)}` };
}

export function cutoffText(mins: number | null): string {
  if (mins === null || mins >= CUTOFF_MIN) return "Before 10am";
  return `${span(CUTOFF_MIN - mins)} left today`;
}

