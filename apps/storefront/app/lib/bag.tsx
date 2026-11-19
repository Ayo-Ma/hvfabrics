import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { minQty, multiply, sum, type Money, type ProductImage, type Unit } from "@hv/core";

/**
 * The bag lives in the browser (localStorage) as a snapshot for display.
 * Prices and stock are re-checked by the server at checkout; the snapshot is never trusted.
 */

export interface BagItem {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  variantLabel: string;
  unit: Unit;
  unitPrice: Money;
  qty: number;
  /** Available units when added; the stepper won't go past it. */
  max: number;
  image?: ProductImage;
}

/* ---------- External store: localStorage + other tabs ---------- */

const KEY = "hv-bag-v1";
const EMPTY: BagItem[] = [];
let cache: BagItem[] | null = null;
const listeners = new Set<() => void>();

function read(): BagItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? (parsed as BagItem[]).filter((i) => i && typeof i.variantId === "string" && i.qty > 0)
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): BagItem[] {
  cache ??= read();
  return cache;
}

function write(next: BagItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage full: the bag still works for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const update = (fn: (prev: BagItem[]) => BagItem[]) => write(fn(getSnapshot()));

const actions = {
  add(item: Omit<BagItem, "qty">, qty: number) {
    update((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, ...item, qty: Math.min(item.max, i.qty + qty) } : i));
      }
      return [...prev, { ...item, qty: Math.min(item.max, qty) }];
    });
  },
  setQty(variantId: string, qty: number) {
    update((prev) =>
      prev.flatMap((i) => (i.variantId !== variantId ? [i] : qty <= 0 ? [] : [{ ...i, qty: Math.min(i.max, Math.max(minQty(i.unit), qty)) }])),
    );
  },
  remove(variantId: string) {
    update((prev) => prev.filter((i) => i.variantId !== variantId));
  },
  clear() {
    write([]);
  },
};

/* ---------- React binding ---------- */

interface BagState {
  items: BagItem[];
  count: number;
  subtotal: Money;
  /** False during server render and hydration, before localStorage has been read. */
  ready: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: typeof actions.add;
  setQty: typeof actions.setQty;
  remove: typeof actions.remove;
  clear: typeof actions.clear;
}

const BagContext = createContext<BagState | null>(null);
const noopSubscribe = () => () => {};

export function BagProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [isOpen, setOpen] = useState(false);

  const value = useMemo<BagState>(() => {
    const currency = items[0]?.unitPrice.currency ?? "NGN";
    return {
      items,
      ready,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: sum(
        items.map((i) => multiply(i.unitPrice, i.qty)),
        currency,
      ),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      ...actions,
    };
  }, [items, ready, isOpen]);

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag(): BagState {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside <BagProvider>");
  return ctx;
}
