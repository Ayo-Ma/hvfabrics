import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { PaystackError, WebhookEventSchema, verifyWebhookSignature } from "@hv/core";
import { z } from "zod";
import { adminApp } from "./admin";
import type { Deps } from "./deps";
import { catalogueJson, rebuildCatalogue, searchIndexJson } from "./services/catalogue";
import { CheckoutRequestSchema, confirmPayment, startCheckout, toPublicOrder } from "./services/orders";

type Cf = { country?: string; city?: string };

function clientKey(c: Context): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
}

function geoOf(c: Context): Cf {
  const cf = (c.req.raw as Request & { cf?: Cf }).cf;
  return { ...(cf?.country ? { country: cf.country } : {}), ...(cf?.city ? { city: cf.city } : {}) };
}

const json = (body: string, maxAge: number) =>
  new Response(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${maxAge}` },
  });

const EventSchema = z.object({
  type: z.enum(["page_view", "product_view", "add_to_bag", "checkout_start", "search"]),
  path: z.string().max(300).optional(),
  productId: z.string().max(128).optional(),
  query: z.string().max(80).optional(),
  referrer: z.string().max(300).optional(),
});

export function createApp(depsFor: (c: Context) => Deps) {
  const app = new Hono();

  // The API serves JSON and photos, never pages: nothing may run, nothing may frame it,
  // browsers must use HTTPS. Photos stay loadable cross-origin (dashboard thumbnails).
  app.use(
    "*",
    secureHeaders({
      strictTransportSecurity: "max-age=31536000; includeSubDomains",
      xFrameOptions: "DENY",
      referrerPolicy: "no-referrer",
      crossOriginResourcePolicy: "cross-origin",
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    }),
  );

  app.use("/events", async (c, next) => {
    const deps = depsFor(c);
    return cors({ origin: deps.storefrontOrigin, allowMethods: ["POST"] })(c, next);
  });
  app.use("/search-index", async (c, next) => {
    const deps = depsFor(c);
    return cors({ origin: deps.storefrontOrigin, allowMethods: ["GET"] })(c, next);
  });

  app.use("/admin/*", async (c, next) => {
    const deps = depsFor(c);
    return cors({
      origin: deps.dashboardOrigin,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    })(c, next);
  });
  app.route("/admin", adminApp(depsFor));

  app.get("/health", (c) => c.json({ ok: true }));

  /**
   * Can the API actually reach what it depends on? Database read + Paystack accepting our key.
   * Booleans only, nothing about the data or keys. Used by the daily security run, so a wrong
   * secret is caught within a day, not by a customer's failed checkout. Rate-limited.
   */
  app.get("/health/deep", async (c) => {
    const deps = depsFor(c);
    if (deps.searchLimiter && !(await deps.searchLimiter.limit({ key: clientKey(c) })).success) return c.json({ message: "Too many requests" }, 429);
    const database = await deps.store.getSettings().then(
      () => true,
      () => false,
    );
    // A made-up reference: a valid key gets "not found", an invalid one gets 401 "Invalid key".
    const payments = deps.paystack
      ? await deps.paystack.verify("hv-health-check").then(
          () => true,
          (e: unknown) => !(e instanceof PaystackError && e.status === 401),
        )
      : false;
    const ok = database && payments;
    return c.json({ ok, database, payments }, ok ? 200 : 503, { "Cache-Control": "no-store" });
  });

  /* ---------- Product photos from R2 (immutable: a new upload gets a new id) ---------- */

  app.get("/images/products/:id/:file", async (c) => {
    const { images } = depsFor(c);
    const id = c.req.param("id");
    const file = c.req.param("file");
    if (!images || !/^[0-9a-f-]{36}$/.test(id) || !/^(400|800|1200|2000)\.(avif|webp)$/.test(file)) {
      return c.json({ message: "Not found" }, 404);
    }
    const obj = await images.get(`products/${id}/${file}`);
    if (!obj) return c.json({ message: "Not found" }, 404);
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: obj.httpEtag,
        "Access-Control-Allow-Origin": "*",
      },
    });
  });

  /* ---------- Catalogue (read by the storefront, cached at the edge) ---------- */

  app.get("/catalogue", async (c) => json(await catalogueJson(depsFor(c)), 30));

  app.get("/search-index", async (c) => {
    const deps = depsFor(c);
    if (deps.searchLimiter && !(await deps.searchLimiter.limit({ key: clientKey(c) })).success) {
      return c.json({ message: "Too many requests" }, 429);
    }
    return json(await searchIndexJson(deps), 60);
  });

  app.get("/settings", async (c) => {
    const s = await depsFor(c).store.getSettings();
    return c.json({ deliveryZones: s.deliveryZones, policies: s.policies, storeAddress: s.storeAddress }, 200, {
      "Cache-Control": "public, max-age=60",
    });
  });

  /* ---------- Checkout ---------- */

  app.post("/checkout", async (c) => {
    const deps = depsFor(c);
    if (deps.checkoutLimiter && !(await deps.checkoutLimiter.limit({ key: clientKey(c) })).success) {
      return c.json({ message: "Too many attempts. Please wait a minute and try again." }, 429);
    }
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = CheckoutRequestSchema.safeParse(body);
    if (!parsed.success) return c.json({ message: "Please check your details.", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);

    const outcome = await startCheckout(deps, parsed.data, geoOf(c));
    switch (outcome.kind) {
      case "ok":
        return c.json({ orderNumber: outcome.orderNumber, authorizationUrl: outcome.authorizationUrl });
      case "stock":
        return c.json({ problems: outcome.problems }, 409);
      case "invalid":
        return c.json({ message: outcome.message }, 400);
      case "unavailable":
        return c.json({ message: outcome.message }, 503);
    }
  });

  /* ---------- Paystack webhook ---------- */

  app.post("/paystack/webhook", async (c) => {
    const deps = depsFor(c);
    if (!deps.paystackSecret) return c.json({ message: "Not configured" }, 503);
    const raw = await c.req.text();
    const ok = await verifyWebhookSignature(raw, c.req.header("x-paystack-signature") ?? null, deps.paystackSecret);
    if (!ok) return c.json({ message: "Invalid signature" }, 401);

    let event;
    try {
      event = WebhookEventSchema.parse(JSON.parse(raw));
    } catch {
      return c.json({ message: "Bad payload" }, 400);
    }
    if (event.event === "charge.success") {
      await confirmPayment(deps, event.data.reference);
    }
    // Acknowledge everything else so Paystack doesn't retry events we don't use.
    return c.json({ received: true });
  });

  /* ---------- Order lookup (confirmation page and tracking) ---------- */

  app.get("/orders/:number", async (c) => {
    const deps = depsFor(c);
    const number = c.req.param("number").toUpperCase();
    const reference = c.req.query("reference");
    const email = c.req.query("email");
    if (!reference && !email) return c.json({ message: "reference or email required" }, 400);

    let order = await deps.store.getOrderByNumber(number);
    // Same 404 for "no such order" and "wrong email/reference", so numbers can't be probed.
    if (!order) return c.json({ message: "Not found" }, 404);
    if (reference) {
      if (order.paystackRef !== reference) return c.json({ message: "Not found" }, 404);
      if (order.status === "pending") order = (await confirmPayment(deps, reference)) ?? order;
    } else if (email && order.customer.email.toLowerCase() !== email.trim().toLowerCase()) {
      return c.json({ message: "Not found" }, 404);
    }
    return c.json(toPublicOrder(order), 200, { "Cache-Control": "no-store" });
  });

  /* ---------- Analytics events (Workers Analytics Engine, not Firestore) ---------- */

  app.post("/events", async (c) => {
    const deps = depsFor(c);
    if (deps.searchLimiter && !(await deps.searchLimiter.limit({ key: clientKey(c) })).success) return c.body(null, 204);
    const parsed = EventSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ message: "Bad event" }, 400);
    const e = parsed.data;
    const geo = geoOf(c);
    deps.events?.writeDataPoint({
      blobs: [e.type, e.path ?? "", e.productId ?? "", geo.country ?? "", geo.city ?? "", e.referrer ?? "", e.query ?? ""],
      doubles: [1],
      indexes: [e.type],
    });
    return c.body(null, 204);
  });

  app.notFound((c) => c.json({ message: "Not found" }, 404));
  app.onError((err, c) => {
    depsFor(c).log("unhandled error", { path: c.req.path, error: String(err) });
    return c.json({ message: "Something went wrong" }, 500);
  });

  return app;
}

/** Cron (every 5 minutes): release expired holds, then refresh the catalogue if anything changed. */
export async function runScheduled(deps: Deps): Promise<number> {
  const n = await deps.store.expireOverdue(deps.now().toISOString());
  if (n > 0) await rebuildCatalogue(deps);
  deps.log("expired reservations", { count: n });
  return n;
}
