import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Product, Settings, Variant } from "@hv/core";
import { createApp, runScheduled } from "./app";
import { DevVerifier } from "./auth/firebase";
import type { BucketLike, Deps, KvLike } from "./deps";
import { MemoryStore } from "./store/memory";
import { SHORTFALL_FLAG } from "./store/logic";

const SECRET = "sk_test_secret";
const ORIGIN = "https://shop.example";
const T0 = new Date("2026-11-13T10:00:00Z");

function product(id: string, status: Product["status"] = "live"): Product {
  return {
    id,
    slug: id,
    line: "fabric",
    title: `Lace ${id}`,
    description: "",
    images: [],
    attributes: {},
    status,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  };
}

function variant(productId: string, key: string, stock: number, price = 1_000_000): Variant {
  return {
    id: `${productId}--${key}`,
    sku: `${productId}-${key}`,
    options: { unit: "yard", colour: "Gold" },
    price: { amount: price, currency: "NGN" },
    stock,
    reserved: 0,
    lowStockAt: 2,
  };
}

const settings: Settings = {
  deliveryZones: [{ id: "lagos", name: "Lagos", fee: { amount: 300_000, currency: "NGN" }, eta: "1–2 days" }],
  storeAddress: "Shop",
  policies: { delivery: "d", returns: "r", privacy: "p" },
  notificationTargets: { emails: ["owner@example.com"], pushTokens: [] },
};

const bankTransfer = { bank: "Opay", accountName: "Harries Vogue", accountNumber: "0123456789" };

class FakeBucket implements BucketLike {
  data = new Map<string, { bytes: Uint8Array; type: string }>();
  async put(k: string, v: Uint8Array, o: { httpMetadata: { contentType: string } }) {
    this.data.set(k, { bytes: v, type: o.httpMetadata.contentType });
  }
  async get(k: string) {
    const o = this.data.get(k);
    return o ? { body: new Response(o.bytes).body!, httpEtag: "etag", httpMetadata: { contentType: o.type } } : null;
  }
}

class FakeKv implements KvLike {
  data = new Map<string, string>();
  async get(k: string) {
    return this.data.get(k) ?? null;
  }
  async put(k: string, v: string) {
    this.data.set(k, v);
  }
  async delete(k: string) {
    this.data.delete(k);
  }
}

function setup(opts: { paystack?: boolean; verifyAmount?: (ref: string) => number; transfer?: boolean; bank?: boolean } = {}) {
  const store = new MemoryStore(
    [
      { product: product("lace"), variants: [variant("lace", "gold", 10)] },
      { product: product("last"), variants: [variant("last", "red", 5)] },
      { product: product("draft", "draft"), variants: [variant("draft", "x", 5)] },
    ],
    opts.bank === false ? settings : { ...settings, bankTransfer },
  );
  const orders = new Map<string, number>();
  const paystack = {
    initialize: vi.fn(async (i: { reference: string; amount: number; callbackUrl: string }) => {
      orders.set(i.reference, i.amount);
      return { authorization_url: `https://checkout.paystack.com/${i.reference}`, access_code: "x", reference: i.reference };
    }),
    verify: vi.fn(async (ref: string) => ({
      reference: ref,
      status: "success",
      amount: opts.verifyAmount ? opts.verifyAmount(ref) : (orders.get(ref) ?? 0),
      currency: "NGN",
      paid_at: "2026-11-13T10:02:00Z",
    })),
  };
  const notify = { orderPaid: vi.fn(async () => undefined) };
  const push = {
    send: vi.fn(async (tokens: readonly string[], _m: unknown) => ({ sent: tokens.length, dead: tokens.filter((t) => t.startsWith("dead")) })),
  };
  const images = new FakeBucket();
  const pending: Promise<unknown>[] = [];
  let now = T0;
  const deps: Deps = {
    store,
    kv: new FakeKv(),
    paystack: opts.paystack === false ? null : paystack,
    paystackSecret: SECRET,
    notify,
    push,
    images,
    admin: new DevVerifier(),
    dashboardOrigin: "https://admin.example",
    storefrontOrigin: ORIGIN,
    paymentMode: opts.transfer ? "transfer" : "card",
    placeholderData: false,
    now: () => now,
    waitUntil: (p) => void pending.push(p),
    log: () => undefined,
  };
  const app = createApp(() => deps);
  return {
    app,
    store,
    deps,
    paystack,
    notify,
    push,
    images,
    settle: () => Promise.all(pending),
    setNow: (d: Date) => (now = d),
  };
}

const customer = { name: "Ada Obi", email: "Ada@Example.com", phone: "0803 123 4567" };
const delivery = { zoneId: "lagos", address: "12 Example Street", city: "Ikeja", state: "Lagos" };

function checkoutBody(items: { variantId: string; qty: number }[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ items, customer, delivery, callbackBase: `${ORIGIN}/order`, ...extra });
}

async function checkout(app: ReturnType<typeof setup>["app"], items: { variantId: string; qty: number }[]) {
  return app.request("/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: checkoutBody(items) });
}

function webhook(app: ReturnType<typeof setup>["app"], reference: string, signWith = SECRET) {
  const body = JSON.stringify({ event: "charge.success", data: { reference, status: "success" } });
  const sig = createHmac("sha512", signWith).update(body).digest("hex");
  return app.request("/paystack/webhook", { method: "POST", headers: { "x-paystack-signature": sig }, body });
}

describe("checkout", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => (t = setup()));

  it("prices on the server, reserves stock and returns the Paystack URL", async () => {
    const res = await checkout(t.app, [
      { variantId: "lace--gold", qty: 3 },
      { variantId: "lace--gold", qty: 2 },
    ]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orderNumber: string; authorizationUrl: string };
    expect(body.orderNumber).toMatch(/^HV-/);
    expect(body.authorizationUrl).toContain("checkout.paystack.com");

    const call = t.paystack.initialize.mock.calls[0]![0] as { amount: number; callbackUrl: string };
    expect(call.amount).toBe(5 * 1_000_000 + 300_000); // 5 yards + delivery, in kobo
    expect(call.callbackUrl).toBe(`${ORIGIN}/order/${body.orderNumber}`);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 5 });
  });

  it("takes an order for more than is in stock: holds what's there and flags the rest for the owner", async () => {
    const res = await checkout(t.app, [{ variantId: "last--red", qty: 6 }]);
    expect(res.status).toBe(200);
    const { orderNumber } = (await res.json()) as { orderNumber: string };
    const order = (await t.store.getOrderByNumber(orderNumber)) as Order;
    expect(order.flags).toContain("ordered_beyond_stock");
    expect(order.items[0]).toMatchObject({ qty: 6, held: 5 });
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 5, reserved: 5 });
    // Cancelled: only what was held goes back.
    await t.store.cancelPending(order.id, "2026-11-27T12:00:00Z");
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 5, reserved: 0 });
  });

  it("a paid order beyond stock sells what was held and stays flagged", async () => {
    const res = await checkout(t.app, [{ variantId: "last--red", qty: 7 }]);
    const { orderNumber } = (await res.json()) as { orderNumber: string };
    const order = (await t.store.getOrderByNumber(orderNumber)) as Order;
    const paid = await t.store.markPaid(order.id, "2026-11-27T12:00:00Z");
    expect(paid?.order.flags).toContain("ordered_beyond_stock");
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 0, reserved: 0 });
  });

  it("refuses draft products and unknown variants", async () => {
    const res = await checkout(t.app, [
      { variantId: "draft--x", qty: 1 },
      { variantId: "nope--1", qty: 1 },
    ]);
    expect(res.status).toBe(409);
    const { problems } = (await res.json()) as { problems: { kind: string }[] };
    expect(problems.map((p) => p.kind)).toEqual(["not_found", "not_found"]);
  });

  it("refuses fabric under the 2-yard minimum without holding stock", async () => {
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 1 }]);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toMatch(/at least 2/);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ reserved: 0 });
    expect(t.paystack.initialize).not.toHaveBeenCalled();
  });

  it("rejects invalid input and foreign callback origins", async () => {
    const bad = await t.app.request("/checkout", { method: "POST", body: "{}" });
    expect(bad.status).toBe(400);
    const foreign = await t.app.request("/checkout", {
      method: "POST",
      body: checkoutBody([{ variantId: "lace--gold", qty: 1 }], { callbackBase: "https://evil.example/order" }),
    });
    expect(foreign.status).toBe(400);
  });

  it("answers 503 honestly when Paystack isn't configured", async () => {
    const u = setup({ paystack: false });
    const res = await checkout(u.app, [{ variantId: "lace--gold", qty: 2 }]);
    expect(res.status).toBe(503);
    expect(u.store.peekVariant("lace--gold")).toMatchObject({ reserved: 0 });
  });

  it("gives stock back immediately if Paystack can't be reached", async () => {
    t.paystack.initialize.mockRejectedValueOnce(new Error("network"));
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }]);
    expect(res.status).toBe(503);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 0 });
  });

  it("20 concurrent buyers of 2 yards, 5 yards on the bolt: every order goes through, stock is never held twice", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkout(t.app, [{ variantId: "last--red", qty: 2 }])));
    expect(results.map((r) => r.status).every((s) => s === 200)).toBe(true);
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 5, reserved: 5 });
  });
});

describe("Paystack webhook", () => {
  async function paidFlow() {
    const t = setup();
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 4 }]);
    const { orderNumber } = (await res.json()) as { orderNumber: string };
    const order = (await t.store.getOrderByNumber(orderNumber)) as Order;
    return { t, order };
  }

  it("rejects a missing or forged signature", async () => {
    const { t, order } = await paidFlow();
    expect((await webhook(t.app, order.id, "sk_test_wrong")).status).toBe(401);
    const unsigned = await t.app.request("/paystack/webhook", { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(401);
    expect((await t.store.getOrder(order.id))!.status).toBe("pending");
  });

  it("verifies, marks paid, moves reserved to sold, records the customer and notifies", async () => {
    const { t, order } = await paidFlow();
    const res = await webhook(t.app, order.id);
    expect(res.status).toBe(200);
    await t.settle();
    const paid = (await t.store.getOrder(order.id))!;
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBe("2026-11-13T10:02:00Z");
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 6, reserved: 0 });
    expect(await t.store.getCustomer("ada@example.com")).toMatchObject({ ordersCount: 1, totalSpent: paid.totals.total });
    expect(t.notify.orderPaid).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a repeated webhook changes nothing", async () => {
    const { t, order } = await paidFlow();
    await webhook(t.app, order.id);
    await webhook(t.app, order.id);
    await webhook(t.app, order.id);
    await t.settle();
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 6, reserved: 0 });
    expect((await t.store.getCustomer("ada@example.com"))!.ordersCount).toBe(1);
    expect(t.notify.orderPaid).toHaveBeenCalledTimes(1);
  });

  it("refuses to mark paid when the amount doesn't match", async () => {
    const t = setup({ verifyAmount: () => 100 });
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }]);
    const { orderNumber } = (await res.json()) as { orderNumber: string };
    const order = (await t.store.getOrderByNumber(orderNumber))!;
    await webhook(t.app, order.id);
    expect((await t.store.getOrder(order.id))!.status).toBe("pending");
  });

  it("acknowledges unknown references without crashing", async () => {
    const t = setup();
    expect((await webhook(t.app, "no-such-order")).status).toBe(200);
  });
});

describe("expiry cron", () => {
  it("releases holds older than 15 minutes and cancels the order", async () => {
    const t = setup();
    const res = await checkout(t.app, [{ variantId: "last--red", qty: 5 }]);
    const { orderNumber } = (await res.json()) as { orderNumber: string };

    t.setNow(new Date(T0.getTime() + 14 * 60_000));
    expect(await runScheduled(t.deps)).toBe(0);
    t.setNow(new Date(T0.getTime() + 16 * 60_000));
    expect(await runScheduled(t.deps)).toBe(1);

    const order = (await t.store.getOrderByNumber(orderNumber))!;
    expect(order.status).toBe("cancelled");
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 5, reserved: 0 });
  });

  it("still honours a late payment when stock remains, and flags it when it doesn't", async () => {
    const t = setup();
    const a = (await (await checkout(t.app, [{ variantId: "last--red", qty: 3 }])).json()) as { orderNumber: string };
    t.setNow(new Date(T0.getTime() + 16 * 60_000));
    await runScheduled(t.deps);
    // Someone else buys 4 of the 5 while order A sits cancelled.
    const b = (await (await checkout(t.app, [{ variantId: "last--red", qty: 4 }])).json()) as { orderNumber: string };
    const orderB = (await t.store.getOrderByNumber(b.orderNumber))!;
    await webhook(t.app, orderB.id);
    // A's late payment arrives: only 1 unit is left, so it's paid but flagged for her attention.
    const orderA = (await t.store.getOrderByNumber(a.orderNumber))!;
    await webhook(t.app, orderA.id);
    const lateA = (await t.store.getOrder(orderA.id))!;
    expect(lateA.status).toBe("paid");
    expect(lateA.flags).toContain(SHORTFALL_FLAG);
    expect(t.store.peekVariant("last--red")).toMatchObject({ stock: 1, reserved: 0 });
  });
});

describe("catalogue and order lookup", () => {
  it("serves the built catalogue without drafts and without any stock count", async () => {
    const t = setup();
    await checkout(t.app, [{ variantId: "lace--gold", qty: 4 }]);
    await t.settle();
    const res = await t.app.request("/catalogue");
    const cat = (await res.json()) as { products: { id: string; variants: { available: number }[] }[] };
    expect(cat.products.map((p) => p.id).sort()).toEqual(["lace", "last"]);
    expect(cat.products.find((p) => p.id === "lace")!.variants[0]!.available).toBe(100); // 6 are really left
    expect(await (await t.app.request("/catalogue")).text()).not.toMatch(/"(stock|reserved|lowStock|lowStockAt)"/);
  });

  it("looks up orders by reference or email, hiding private fields", async () => {
    const t = setup();
    const { orderNumber } = (await (await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }])).json()) as { orderNumber: string };
    const order = (await t.store.getOrderByNumber(orderNumber))!;

    const byRef = await t.app.request(`/orders/${orderNumber}?reference=${order.id}`);
    expect(byRef.status).toBe(200);
    const pub = (await byRef.json()) as Record<string, unknown>;
    expect(pub.status).toBe("paid"); // the return page confirms with Paystack if the webhook is late
    expect(pub).not.toHaveProperty("customer");

    expect((await t.app.request(`/orders/${orderNumber}?email=ada@example.com`)).status).toBe(200);
    expect((await t.app.request(`/orders/${orderNumber}?email=someone@else.com`)).status).toBe(404);
    expect((await t.app.request(`/orders/${orderNumber}?reference=wrong`)).status).toBe(404);
    expect((await t.app.request(`/orders/HV-NOPE22?email=ada@example.com`)).status).toBe(404);
  });
});

/* ------------------------------------------------------------------ */
/* Dashboard API                                                       */
/* ------------------------------------------------------------------ */

const as = (role: "owner" | "manager" | "packer") => ({ Authorization: `Bearer dev:${role}` });
const jsonHeaders = (role: "owner" | "manager" | "packer") => ({ ...as(role), "Content-Type": "application/json" });

async function paidOrder(t: ReturnType<typeof setup>, qty = 2) {
  const { orderNumber } = (await (await checkout(t.app, [{ variantId: "lace--gold", qty }])).json()) as { orderNumber: string };
  const order = (await t.store.getOrderByNumber(orderNumber))!;
  await webhook(t.app, order.id);
  await t.settle();
  return (await t.store.getOrder(order.id))!;
}

const productBody = (over: Record<string, unknown> = {}) => ({
  slug: "emerald-lace",
  line: "fabric",
  title: "Emerald lace",
  description: "",
  images: [],
  attributes: {},
  status: "live",
  variants: [
    { key: "v1", sku: "EL-1", options: { unit: "yard", colour: "Emerald" }, price: { amount: 1_200_000, currency: "NGN" }, stock: 12, lowStockAt: 3 },
  ],
  ...over,
});

describe("dashboard access", () => {
  it("needs a sign-in and the right role", async () => {
    const t = setup();
    expect((await t.app.request("/admin/me")).status).toBe(401);
    expect((await t.app.request("/admin/me", { headers: { Authorization: "Bearer dev:hacker" } })).status).toBe(401);
    const me = (await (await t.app.request("/admin/me", { headers: as("packer") })).json()) as { role: string; can: Record<string, boolean> };
    expect(me).toMatchObject({ role: "packer", can: { orders: true, products: false, takings: false } });
    expect((await t.app.request("/admin/products", { headers: as("packer") })).status).toBe(403);
    expect((await t.app.request("/admin/takings?since=2026-11-01T00:00:00Z", { headers: as("packer") })).status).toBe(403);
    expect((await t.app.request("/admin/orders", { headers: as("packer") })).status).toBe(200);
  });

  it("only lets the dashboard origin call it from a browser", async () => {
    const t = setup();
    const pre = await t.app.request("/admin/orders", {
      method: "OPTIONS",
      headers: { Origin: "https://admin.example", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
    });
    expect(pre.headers.get("access-control-allow-origin")).toBe("https://admin.example");
    const evil = await t.app.request("/admin/orders", { headers: { ...as("owner"), Origin: "https://evil.example" } });
    expect(evil.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});

describe("orders board", () => {
  it("lists paid orders as New and moves them New → Packed → Sent, refusing skips", async () => {
    const t = setup();
    const order = await paidOrder(t);
    const board = (await (await t.app.request("/admin/orders", { headers: as("packer") })).json()) as { orders: { id: string; status: string }[] };
    expect(board.orders.map((o) => [o.id, o.status])).toEqual([[order.id, "paid"]]);

    const move = (to: string) =>
      t.app.request(`/admin/orders/${order.id}/move`, { method: "POST", headers: jsonHeaders("packer"), body: JSON.stringify({ to }) });
    expect((await move("shipped")).status).toBe(409);
    expect((await move("cancelled")).status).toBe(400);
    const packed = (await (await move("packed")).json()) as { status: string; packedAt: string };
    expect(packed).toMatchObject({ status: "packed", packedAt: T0.toISOString() });
    expect(((await (await move("shipped")).json()) as { status: string }).status).toBe("shipped");
    const missing = await t.app.request(`/admin/orders/nope/move`, { method: "POST", headers: jsonHeaders("packer"), body: JSON.stringify({ to: "packed" }) });
    expect(missing.status).toBe(404);
  });

  it("returns paid orders for money in, never pending ones", async () => {
    const t = setup();
    const paid = await paidOrder(t);
    await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }]); // pending, unpaid
    const res = await t.app.request("/admin/takings?since=2026-11-01T00:00:00Z", { headers: as("owner") });
    const body = (await res.json()) as { orders: { id: string }[] };
    expect(body.orders.map((o) => o.id)).toEqual([paid.id]);
    expect((await t.app.request("/admin/takings?since=yesterday", { headers: as("owner") })).status).toBe(400);
  });
});

describe("cancel and refund (owner)", () => {
  const refund = (t: ReturnType<typeof setup>, id: string, role: "owner" | "manager" | "packer", body: Record<string, unknown>) =>
    t.app.request(`/admin/orders/${id}/refund`, { method: "POST", headers: jsonHeaders(role), body: JSON.stringify(body) });

  it("cancels a paid order, records the transfer refund and puts the yards back", async () => {
    const t = setup();
    const order = await paidOrder(t, 3);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 7, reserved: 0 });
    const res = await refund(t, order.id, "owner", { restock: true, reference: "TRF-123", reason: "Customer changed her mind" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; refund: Record<string, unknown> };
    expect(body.status).toBe("cancelled");
    expect(body.refund).toMatchObject({ method: "bank_transfer", reference: "TRF-123", restocked: true, by: "dev-owner", amount: order.totals.total });
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 0 });
  });

  it("leaves stock alone when the fabric was already cut", async () => {
    const t = setup();
    const order = await paidOrder(t, 2);
    const res = await refund(t, order.id, "owner", { restock: false });
    expect(((await res.json()) as { refund: { restocked: boolean } }).refund.restocked).toBe(false);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 8 });
  });

  it("is for the owner only", async () => {
    const t = setup();
    const order = await paidOrder(t);
    expect((await refund(t, order.id, "manager", { restock: true })).status).toBe(403);
    expect((await refund(t, order.id, "packer", { restock: true })).status).toBe(403);
    expect((await refund(t, order.id, "owner", { restock: "yes" })).status).toBe(400);
    expect((await refund(t, "nope", "owner", { restock: true })).status).toBe(404);
  });

  it("refuses twice, refuses sent orders, and a late Paystack confirmation can't revive it", async () => {
    const t = setup();
    const order = await paidOrder(t);
    expect((await refund(t, order.id, "owner", { restock: true })).status).toBe(200);
    expect((await refund(t, order.id, "owner", { restock: true })).status).toBe(409);
    await webhook(t.app, order.id);
    await t.settle();
    expect((await t.store.getOrder(order.id))!.status).toBe("cancelled");
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10 });

    const sent = await paidOrder(t);
    const move = (to: string) => t.app.request(`/admin/orders/${sent.id}/move`, { method: "POST", headers: jsonHeaders("owner"), body: JSON.stringify({ to }) });
    await move("packed");
    await move("shipped");
    expect((await refund(t, sent.id, "owner", { restock: true })).status).toBe(409);
  });

  it("drops a refunded order from money in", async () => {
    const t = setup();
    const order = await paidOrder(t);
    await refund(t, order.id, "owner", { restock: false });
    const res = await t.app.request("/admin/takings?since=2026-11-01T00:00:00Z", { headers: as("owner") });
    const { orders } = (await res.json()) as { orders: { id: string; status: string }[] };
    // Listed for the record, but cancelled orders never count toward takings (see takings() in @hv/core).
    expect(orders.find((o) => o.id === order.id)?.status ?? "cancelled").toBe("cancelled");
  });
});

describe("bank transfer (PAYMENT_MODE transfer)", () => {
  const confirm = (t: ReturnType<typeof setup>, id: string, role: "owner" | "manager" | "packer" = "owner") =>
    t.app.request(`/admin/orders/${id}/confirm-transfer`, { method: "POST", headers: as(role) });
  const cancel = (t: ReturnType<typeof setup>, id: string) => t.app.request(`/admin/orders/${id}/cancel-transfer`, { method: "POST", headers: as("owner") });

  async function placed(t: ReturnType<typeof setup>, qty = 2) {
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty }]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orderNumber: string; authorizationUrl: string };
    return { ...body, order: (await t.store.getOrderByNumber(body.orderNumber))! };
  }

  it("places the order without Paystack, holds the yards for 24 hours and sends the shopper to her order page", async () => {
    const t = setup({ transfer: true, paystack: false });
    const { authorizationUrl, order } = await placed(t, 3);
    expect(order).toMatchObject({ status: "pending", payment: "transfer", reservedUntil: "2026-11-14T10:00:00.000Z" });
    expect(authorizationUrl).toBe(`${ORIGIN}/order/${order.number}?reference=${order.paystackRef}`);
    expect(t.paystack.initialize).not.toHaveBeenCalled();
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 3 });
  });

  it("refuses to take orders until the shop's account is set", async () => {
    const t = setup({ transfer: true, bank: false });
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }]);
    expect(res.status).toBe(503);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ reserved: 0 });
  });

  it("shows the account to pay into while the transfer is awaited, on her order page and on Track an order", async () => {
    const t = setup({ transfer: true });
    const { order } = await placed(t);
    const own = (await (await t.app.request(`/orders/${order.number}?reference=${order.paystackRef}`)).json()) as Record<string, unknown>;
    expect(own).toMatchObject({ status: "pending", payment: "transfer", holdUntil: order.reservedUntil, payTo: { accountNumber: "0123456789" } });
    expect(t.paystack.verify).not.toHaveBeenCalled();
    const byEmail = (await (await t.app.request(`/orders/${order.number}?email=ada@example.com`)).json()) as Record<string, unknown>;
    expect(byEmail).toMatchObject({ payTo: { accountNumber: "0123456789" } });
    const wrongEmail = await t.app.request(`/orders/${order.number}?email=someone@example.com`);
    expect(wrongEmail.status).toBe(404);
    expect((await t.app.request("/settings")).headers.get("cache-control")).toContain("max-age");
    expect(((await (await t.app.request("/settings")).json()) as { payment: string }).payment).toBe("transfer");
  });

  it("lists waiting transfers; confirming takes the stock, records the customer and alerts her", async () => {
    const t = setup({ transfer: true });
    const { order } = await placed(t, 3);
    await t.settle();
    const waiting = (await (await t.app.request("/admin/orders/awaiting", { headers: as("manager") })).json()) as { orders: { id: string }[] };
    expect(waiting.orders.map((o) => o.id)).toEqual([order.id]);
    expect((await t.app.request("/admin/orders/awaiting", { headers: as("packer") })).status).toBe(403);
    expect((await confirm(t, order.id, "packer")).status).toBe(403);

    const res = await confirm(t, order.id);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("paid");
    await t.settle();
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 7, reserved: 0 });
    expect(t.notify.orderPaid).toHaveBeenCalledTimes(1);
    expect((await t.store.getOrder(order.id))!.paidAt).toBe(T0.toISOString());
    // Twice is harmless; it doesn't sell the yards again.
    expect((await confirm(t, order.id)).status).toBe(200);
    await t.settle();
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 7 });
    expect(t.notify.orderPaid).toHaveBeenCalledTimes(1);
    const after = (await (await t.app.request("/admin/orders/awaiting", { headers: as("owner") })).json()) as { orders: unknown[] };
    expect(after.orders).toEqual([]);
  });

  it("a late confirmation after the hold ran out still takes the stock if it's there", async () => {
    const t = setup({ transfer: true });
    const { order } = await placed(t, 2);
    t.setNow(new Date("2026-11-14T11:00:00Z"));
    await runScheduled(t.deps);
    expect((await t.store.getOrder(order.id))!.status).toBe("cancelled");
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 0 });
    expect(((await (await confirm(t, order.id)).json()) as { status: string }).status).toBe("paid");
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 8 });
  });

  it("cancelling an unpaid transfer gives the yards back; card orders can't be confirmed by hand", async () => {
    const t = setup({ transfer: true });
    const { order } = await placed(t, 2);
    expect(((await (await cancel(t, order.id)).json()) as { status: string }).status).toBe("cancelled");
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ reserved: 0 });
    expect((await cancel(t, order.id)).status).toBe(409);

    const card = setup();
    const res = await checkout(card.app, [{ variantId: "lace--gold", qty: 2 }]);
    const { orderNumber } = (await res.json()) as { orderNumber: string };
    const cardOrder = (await card.store.getOrderByNumber(orderNumber))!;
    expect((await confirm(card, cardOrder.id)).status).toBe(409);
    expect((await confirm(card, "nope")).status).toBe(404);
  });
});

describe("offers consent at checkout", () => {
  it("saves the tick only when the customer gives it", async () => {
    const t = setup();
    const withTick = await t.app.request("/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: checkoutBody([{ variantId: "lace--gold", qty: 2 }], { marketingOptIn: true }) });
    const a = (await withTick.json()) as { orderNumber: string };
    expect((await t.store.getOrderByNumber(a.orderNumber))!.marketingOptIn).toBe(true);
    const without = (await (await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }])).json()) as { orderNumber: string };
    expect((await t.store.getOrderByNumber(without.orderNumber))!.marketingOptIn).toBeUndefined();
  });
});

describe("products and stock", () => {
  it("creates a product, publishes it to the catalogue and refuses a second one on the same address", async () => {
    const t = setup();
    const res = await t.app.request("/admin/products", { method: "POST", headers: jsonHeaders("manager"), body: JSON.stringify(productBody()) });
    expect(res.status).toBe(201);
    const entry = (await res.json()) as { product: { id: string }; variants: { id: string; reserved: number }[] };
    expect(entry.product.id).toBe("emerald-lace");
    expect(entry.variants).toEqual([expect.objectContaining({ id: "emerald-lace--v1", reserved: 0 })]);
    await t.settle();
    const cat = JSON.parse((await t.deps.kv.get("catalogue:v3"))!) as { products: { id: string }[] };
    expect(cat.products.map((p) => p.id)).toContain("emerald-lace");

    const again = await t.app.request("/admin/products", {
      method: "POST",
      headers: jsonHeaders("manager"),
      body: JSON.stringify(productBody({ title: "Another" })),
    });
    expect(again.status).toBe(409);
    const empty = await t.app.request("/admin/products", { method: "POST", headers: jsonHeaders("manager"), body: JSON.stringify(productBody({ variants: [] })) });
    expect(empty.status).toBe(400);
  });

  it("keeps shoppers' holds: stock can't drop below what's held, and a held variant can't be removed", async () => {
    const t = setup();
    await checkout(t.app, [{ variantId: "lace--gold", qty: 4 }]); // holds 4 of 10
    const patch = (stock: number) =>
      t.app.request("/admin/variants/lace--gold", { method: "PATCH", headers: jsonHeaders("owner"), body: JSON.stringify({ stock }) });
    const refused = await patch(3);
    expect(refused.status).toBe(409);
    expect(((await refused.json()) as { held: number }).held).toBe(4);
    expect((await (await patch(7)).json()) as { stock: number; reserved: number }).toMatchObject({ stock: 7, reserved: 4 });

    const lace = (await (await t.app.request("/admin/products/lace", { headers: as("owner") })).json()) as { product: Record<string, unknown> };
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = lace.product;
    const without = {
      ...fields,
      variants: [{ key: "silver", sku: "S", options: { unit: "yard" }, price: { amount: 100, currency: "NGN" }, stock: 1, lowStockAt: 0 }],
    };
    const removeHeld = await t.app.request("/admin/products/lace", { method: "PUT", headers: jsonHeaders("owner"), body: JSON.stringify(without) });
    expect(removeHeld.status).toBe(409);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 7, reserved: 4 });
  });

  it("accepts only real AVIF/WebP photos at the agreed sizes, and serves them back", async () => {
    const t = setup();
    const id = "0b9f2c4e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
    const enc = (x: string) => [...new TextEncoder().encode(x)];
    const webp = new Uint8Array([...enc("RIFF"), 0, 0, 0, 0, ...enc("WEBPVP8 "), 1, 2, 3]);
    const put = (file: string, body: Uint8Array, type: string) =>
      t.app.request(`/admin/images/${id}/${file}`, { method: "PUT", headers: { ...as("manager"), "Content-Type": type }, body });
    expect((await put("800.webp", new Uint8Array(16), "image/webp")).status).toBe(415);
    expect((await put("800.webp", webp, "image/avif")).status).toBe(415);
    expect((await put("900.webp", webp, "image/webp")).status).toBe(400);
    expect((await put("800.webp", webp, "image/webp")).status).toBe(201);
    const back = await t.app.request(`/images/products/${id}/800.webp`);
    expect(back.status).toBe(200);
    expect(back.headers.get("content-type")).toBe("image/webp");
    expect(back.headers.get("cache-control")).toContain("immutable");
  });
});

describe("push alerts", () => {
  it("pushes every paid order to her registered phones and drops dead ones", async () => {
    const t = setup();
    for (const token of ["phone-token-aaaaaaaaaaaaaaaa", "dead-token-bbbbbbbbbbbbbbbbbb"]) {
      await t.app.request("/admin/push/tokens", { method: "POST", headers: jsonHeaders("owner"), body: JSON.stringify({ token }) });
    }
    const order = await paidOrder(t);
    expect(t.push.send).toHaveBeenCalledWith(
      ["phone-token-aaaaaaaaaaaaaaaa", "dead-token-bbbbbbbbbbbbbbbbbb"],
      expect.objectContaining({ title: expect.stringContaining(order.number), url: `/orders/${order.id}` }),
    );
    expect((await t.store.getSettings()).notificationTargets.pushTokens).toEqual(["phone-token-aaaaaaaaaaaaaaaa"]);
  });

  it("hides the sample-order seeder outside placeholder mode", async () => {
    const t = setup();
    expect((await t.app.request("/admin/dev/sample-orders", { method: "POST", headers: as("owner") })).status).toBe(404);
  });
});

describe("security headers", () => {
  it("sends HTTPS-only, no-sniff, no-framing and a deny-all CSP on every response, and keeps photos embeddable", async () => {
    const t = setup();
    for (const path of ["/health", "/catalogue", "/admin/me", "/nope"]) {
      const res = await t.app.request(path);
      expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(res.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    }
  });
});

describe("deep health check", () => {
  it("reports database and payments reachable, and 503 when Paystack rejects the key", async () => {
    const t = setup();
    const ok = await t.app.request("/health/deep");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, database: true, payments: true });

    const { PaystackError } = await import("@hv/core");
    t.paystack.verify.mockRejectedValueOnce(new PaystackError("Paystack /transaction/verify: Invalid key", 401));
    const bad = await t.app.request("/health/deep");
    expect(bad.status).toBe(503);
    expect(await bad.json()).toEqual({ ok: false, database: true, payments: false });
  });
});
