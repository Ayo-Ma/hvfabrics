import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Product, Settings, Variant } from "@hv/core";
import { createApp, runScheduled } from "./app";
import type { Deps, KvLike } from "./deps";
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

function setup(opts: { paystack?: boolean; verifyAmount?: (ref: string) => number } = {}) {
  const store = new MemoryStore(
    [
      { product: product("lace"), variants: [variant("lace", "gold", 10)] },
      { product: product("last"), variants: [variant("last", "red", 5)] },
      { product: product("draft", "draft"), variants: [variant("draft", "x", 5)] },
    ],
    settings,
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
  const pending: Promise<unknown>[] = [];
  let now = T0;
  const deps: Deps = {
    store,
    kv: new FakeKv(),
    paystack: opts.paystack === false ? null : paystack,
    paystackSecret: SECRET,
    notify,
    storefrontOrigin: ORIGIN,
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

  it("refuses more than is available, with the exact problem", async () => {
    const res = await checkout(t.app, [{ variantId: "last--red", qty: 6 }]);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ problems: [{ variantId: "last--red", kind: "insufficient", available: 5, requested: 6 }] });
    expect(t.store.peekVariant("last--red")).toMatchObject({ reserved: 0 });
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
    const res = await checkout(u.app, [{ variantId: "lace--gold", qty: 1 }]);
    expect(res.status).toBe(503);
    expect(u.store.peekVariant("lace--gold")).toMatchObject({ reserved: 0 });
  });

  it("gives stock back immediately if Paystack can't be reached", async () => {
    t.paystack.initialize.mockRejectedValueOnce(new Error("network"));
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 2 }]);
    expect(res.status).toBe(503);
    expect(t.store.peekVariant("lace--gold")).toMatchObject({ stock: 10, reserved: 0 });
  });

  it("never oversells: 20 concurrent buyers, 5 units", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => checkout(t.app, [{ variantId: "last--red", qty: 1 }])));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(15);
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
    const res = await checkout(t.app, [{ variantId: "lace--gold", qty: 1 }]);
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
  it("serves the built catalogue with live availability, without drafts", async () => {
    const t = setup();
    await checkout(t.app, [{ variantId: "lace--gold", qty: 4 }]);
    await t.settle();
    const res = await t.app.request("/catalogue");
    const cat = (await res.json()) as { products: { id: string; variants: { available: number }[] }[] };
    expect(cat.products.map((p) => p.id).sort()).toEqual(["lace", "last"]);
    expect(cat.products.find((p) => p.id === "lace")!.variants[0]!.available).toBe(6);
  });

  it("looks up orders by reference or email, hiding private fields", async () => {
    const t = setup();
    const { orderNumber } = (await (await checkout(t.app, [{ variantId: "lace--gold", qty: 1 }])).json()) as { orderNumber: string };
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
