import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * A tiny shared cache for API reads: screens that read the same thing share one request,
 * old values stay on screen while a refresh runs (no layout jump), and a write can update
 * or refetch a key. Kept outside React state so components only subscribe.
 */

export interface Snapshot<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** When the data last arrived (ms). */
  at: number | undefined;
}

interface Entry<T> {
  snap: Snapshot<T>;
  inflight: Promise<void> | null;
  fetcher: () => Promise<T>;
  listeners: Set<() => void>;
}

const cache = new Map<string, Entry<unknown>>();
const EMPTY: Snapshot<never> = { data: undefined, error: undefined, loading: true, at: undefined };

function entry<T>(key: string, fetcher: () => Promise<T>): Entry<T> {
  let e = cache.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { snap: EMPTY, inflight: null, fetcher, listeners: new Set() };
    cache.set(key, e as Entry<unknown>);
  }
  e.fetcher = fetcher;
  return e;
}

function emit(e: Entry<unknown>) {
  for (const l of e.listeners) l();
}

export function refetch(key: string): Promise<void> {
  const e = cache.get(key);
  if (!e) return Promise.resolve();
  if (e.inflight) return e.inflight;
  e.snap = { ...e.snap, loading: true };
  emit(e);
  e.inflight = e
    .fetcher()
    .then((data) => {
      e.snap = { data, error: undefined, loading: false, at: Date.now() };
    })
    .catch((error: unknown) => {
      e.snap = { ...e.snap, error: error instanceof Error ? error : new Error(String(error)), loading: false };
    })
    .finally(() => {
      e.inflight = null;
      emit(e);
    });
  return e.inflight;
}

/** Replace cached data after a write (optimistic or from the server's answer). */
export function setData<T>(key: string, update: (old: T | undefined) => T | undefined) {
  const e = cache.get(key) as Entry<T> | undefined;
  if (!e) return;
  e.snap = { ...e.snap, data: update(e.snap.data) };
  emit(e as Entry<unknown>);
}

/** Refetch every cached key that starts with `prefix` (e.g. after saving a product). */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) void refetch(key);
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { every?: number } = {}): Snapshot<T> & { refresh: () => Promise<void> } {
  const e = key ? entry(key, fetcher) : null;

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!e) return () => undefined;
      e.listeners.add(cb);
      return () => e.listeners.delete(cb);
    },
    [e],
  );
  const snap = useSyncExternalStore(
    subscribe,
    () => (e ? (e.snap as Snapshot<T>) : (EMPTY as Snapshot<T>)),
    () => EMPTY as Snapshot<T>,
  );

  useEffect(() => {
    if (!key) return;
    const ent = cache.get(key);
    if (ent && ent.snap.at === undefined && !ent.inflight) void refetch(key);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refetch(key);
    };
    document.addEventListener("visibilitychange", onFocus);
    const timer = opts.every ? window.setInterval(() => document.visibilityState === "visible" && void refetch(key), opts.every) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      if (timer) window.clearInterval(timer);
    };
  }, [key, opts.every]);

  const refresh = useCallback(() => (key ? refetch(key) : Promise.resolve()), [key]);
  return { ...snap, refresh };
}
