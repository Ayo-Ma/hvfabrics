import type { BOARD_LABELS, Order, Product, ProductInput, StockPatch, Variant } from "@hv/core";
import { api } from "./api";
import { invalidate, setData, useQuery } from "./query";
import type { RefundInput } from "@hv/core";

/** Every read and write the dashboard makes, in one place. */

export interface Entry {
  product: Product;
  variants: Variant[];
}

export const keys = {
  board: "orders:board",
  order: (id: string) => `orders:one:${id}`,
  takings: "takings",
  products: "products:all",
  product: (id: string) => `products:one:${id}`,
};

/** Paid orders from the last 40 days cover this week and this month. */
function takingsSince(): string {
  return new Date(Date.now() - 40 * 86_400_000).toISOString();
}

export const useBoard = () => useQuery(keys.board, () => api<{ orders: Order[]; at: string }>("/admin/orders"), { every: 30_000 });
export const useOrder = (id: string) => useQuery(keys.order(id), () => api<Order>(`/admin/orders/${encodeURIComponent(id)}`));
export const useTakings = (enabled: boolean) =>
  useQuery(enabled ? keys.takings : null, () => api<{ orders: Order[]; at: string }>(`/admin/takings?since=${takingsSince()}`), { every: 60_000 });
export const useProducts = (enabled = true) => useQuery(enabled ? keys.products : null, () => api<{ entries: Entry[] }>("/admin/products"));
export const useProduct = (id: string | null) => useQuery(id ? keys.product(id) : null, () => api<Entry>(`/admin/products/${encodeURIComponent(id!)}`));

export type BoardStatus = keyof Pick<typeof BOARD_LABELS, "paid" | "packed" | "shipped" | "delivered">;

export async function moveOrder(order: Order, to: BoardStatus): Promise<Order> {
  // Optimistic: the card moves at once; the server's answer replaces it.
  setData<{ orders: Order[]; at: string }>(keys.board, (b) => b && { ...b, orders: b.orders.map((o) => (o.id === order.id ? { ...o, status: to } : o)) });
  try {
    const next = await api<Order>(`/admin/orders/${order.id}/move`, { body: { to } });
    setData<{ orders: Order[]; at: string }>(keys.board, (b) => b && { ...b, orders: b.orders.map((o) => (o.id === next.id ? next : o)) });
    setData<Order>(keys.order(order.id), () => next);
    invalidate(keys.takings);
    return next;
  } catch (e) {
    setData<{ orders: Order[]; at: string }>(keys.board, (b) => b && { ...b, orders: b.orders.map((o) => (o.id === order.id ? order : o)) });
    throw e;
  }
}

/** Owner only: cancel a paid order and record the bank-transfer refund (optionally restocking). */
export async function refundOrder(order: Order, input: RefundInput): Promise<Order> {
  const next = await api<Order>(`/admin/orders/${order.id}/refund`, { body: input });
  setData<Order>(keys.order(order.id), () => next);
  setData<{ orders: Order[]; at: string }>(keys.board, (b) => b && { ...b, orders: b.orders.filter((o) => o.id !== next.id) });
  invalidate(keys.takings);
  return next;
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<Entry> {
  const entry = id
    ? await api<Entry>(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", body: input })
    : await api<Entry>("/admin/products", { method: "POST", body: input });
  setData<Entry>(keys.product(entry.product.id), () => entry);
  invalidate("products:all");
  return entry;
}

export async function patchStock(variantId: string, patch: StockPatch): Promise<Variant> {
  const v = await api<Variant>(`/admin/variants/${encodeURIComponent(variantId)}`, { method: "PATCH", body: patch });
  const update = (e: Entry): Entry => ({ ...e, variants: e.variants.map((x) => (x.id === v.id ? v : x)) });
  setData<{ entries: Entry[] }>(keys.products, (d) => d && { entries: d.entries.map(update) });
  for (const k of [keys.product(v.id.slice(0, v.id.lastIndexOf("--")))]) setData<Entry>(k, (e) => e && update(e));
  return v;
}

export function seedSampleOrders() {
  return api<{ created: number }>("/admin/dev/sample-orders", { body: {} }).then((r) => {
    invalidate("orders:");
    invalidate(keys.takings);
    invalidate("products:");
    return r;
  });
}
