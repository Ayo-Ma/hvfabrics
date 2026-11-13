import { useSyncExternalStore } from "react";

/** The current time, ticking once a minute, so "3 h ago" and "today" stay true without impure renders. */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: number | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (timer === undefined) {
    timer = window.setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => now);
}

/** Call after data lands so a long-open screen doesn't lag a minute behind it. */
export function tick() {
  now = Date.now();
  for (const l of listeners) l();
}
