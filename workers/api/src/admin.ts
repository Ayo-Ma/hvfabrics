import { Hono, type Context } from "hono";
import {
  OrderMoveSchema,
  ProductInputSchema,
  PushTokenSchema,
  StockPatchSchema,
  roleCan,
  variantIdSchema,
  type AdminRole,
  type ROLE_CAN,
} from "@hv/core";
import { z } from "zod";
import type { AdminUser } from "./auth/firebase";
import type { Deps } from "./deps";
import { rebuildLater } from "./services/catalogue";
import { alertOwner } from "./services/orders";
import { orderPaidPush } from "./services/push";
import { seedSampleOrders } from "./services/samples";
import type { SaveProductResult, StockResult } from "./store/types";

/**
 * The dashboard's API. Every route needs a Firebase ID token with the admin claim
 * (or, in local development only, a dev token). Roles: packers see and move orders;
 * owners and managers also edit products and stock and see money in.
 */

type Env = { Variables: { user: AdminUser; deps: Deps } };

const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IMAGE_FILE = /^(400|800|1200|2000)\.(avif|webp)$/;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TAKINGS_DAYS = 62;

/** Checks the file really is what its name says: WebP is RIFF….WEBP, AVIF is an ISO-BMFF "ftyp" box with an avif brand. */
export function looksLike(ext: "avif" | "webp", bytes: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ext === "webp") return bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return bytes.length > 12 && ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
}

function savedOrProblem(c: Context, r: SaveProductResult | StockResult) {
  if (r.ok) return null;
  switch (r.reason) {
    case "not_found":
      return c.json({ message: "Not found" }, 404);
    case "exists":
      return c.json({ message: "A product with this id already exists" }, 409);
    case "slug_taken":
      return c.json({ message: "Another product already uses this web address. Change the slug." }, 409);
    case "held":
      return c.json(
        {
          message: `${r.held} of this are held by shoppers paying right now. Stock can't go below ${r.held} until they finish (up to 15 minutes).`,
          variantId: r.variantId,
          held: r.held,
        },
        409,
      );
  }
}

export function adminApp(depsFor: (c: Context) => Deps) {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const deps = depsFor(c);
    const result = await deps.admin.verify(c.req.header("authorization"));
    if (!result.ok) return c.json({ message: result.message }, result.status);
    c.set("user", result.user);
    c.set("deps", deps);
    await next();
  });

  const need = (what: keyof typeof ROLE_CAN) => async (c: Context<Env>, next: () => Promise<void>) => {
    if (!roleCan(c.get("user").role, what)) return c.json({ message: "Your role can't do this" }, 403);
    await next();
  };

  const body = async <T extends z.ZodType>(c: Context<Env>, schema: T) => {
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    return parsed.success
      ? ({ ok: true, data: parsed.data } as const)
      : ({ ok: false, res: c.json({ message: "Please check the form.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400) } as const);
  };

  const nowIso = (c: Context<Env>) => c.get("deps").now().toISOString();
  /** Route params are always present on the routes that read them; "" never matches a document. */
  const param = (c: Context<Env>, key: string) => c.req.param(key) ?? "";

  app.get("/me", (c) => {
    const user = c.get("user");
    const can = (r: AdminRole) => ({ orders: roleCan(r, "orders"), products: roleCan(r, "products"), takings: roleCan(r, "takings") });
    return c.json({ ...user, can: can(user.role), sampleData: c.get("deps").placeholderData });
  });

  /* ---------- Orders board ---------- */

  app.get("/orders", need("orders"), async (c) => {
    const { store } = c.get("deps");
    const [open, sent] = await Promise.all([store.listOrders(["paid", "packed"], 200), store.listOrders(["shipped"], 30)]);
    return c.json({ orders: [...open, ...sent], at: nowIso(c) }, 200, { "Cache-Control": "no-store" });
  });

  app.get("/orders/:id", need("orders"), async (c) => {
    const order = await c.get("deps").store.getOrder(param(c, "id"));
    return order ? c.json(order, 200, { "Cache-Control": "no-store" }) : c.json({ message: "Not found" }, 404);
  });

  app.post("/orders/:id/move", need("orders"), async (c) => {
    const b = await body(c, OrderMoveSchema);
    if (!b.ok) return b.res;
    const r = await c.get("deps").store.moveOrder(param(c, "id"), b.data.to, nowIso(c));
    if (r.ok) return c.json(r.order);
    return r.reason === "not_found" ? c.json({ message: "Not found" }, 404) : c.json({ message: r.message }, 409);
  });

  /* ---------- Money in ---------- */

  app.get("/takings", need("takings"), async (c) => {
    const deps = c.get("deps");
    const since = z.iso.datetime().safeParse(c.req.query("since"));
    if (!since.success) return c.json({ message: "since must be an ISO date-time" }, 400);
    const oldest = new Date(deps.now().getTime() - MAX_TAKINGS_DAYS * 86_400_000).toISOString();
    const orders = await deps.store.listPaidSince(since.data < oldest ? oldest : since.data, 2000);
    return c.json({ orders, at: nowIso(c) }, 200, { "Cache-Control": "no-store" });
  });

  /* ---------- Products and stock ---------- */

  app.get("/products", need("products"), async (c) => {
    const entries = await c.get("deps").store.listAllEntries();
    entries.sort((a, b) => b.product.updatedAt.localeCompare(a.product.updatedAt));
    return c.json({ entries }, 200, { "Cache-Control": "no-store" });
  });

  app.get("/products/:id", need("products"), async (c) => {
    const entry = await c.get("deps").store.getEntry(param(c, "id"));
    return entry ? c.json(entry, 200, { "Cache-Control": "no-store" }) : c.json({ message: "Not found" }, 404);
  });

  app.post("/products", need("products"), async (c) => {
    const deps = c.get("deps");
    const b = await body(c, ProductInputSchema);
    if (!b.ok) return b.res;
    // The id is fixed at creation (variant ids hang off it); the slug can change later.
    let id = b.data.slug;
    if (await deps.store.getEntry(id)) id = `${b.data.slug}-${crypto.randomUUID().slice(0, 4)}`;
    const r = await deps.store.saveProduct(id, b.data, nowIso(c), "create");
    const problem = savedOrProblem(c, r);
    if (problem) return problem;
    rebuildLater(deps, "product created");
    return c.json((r as Extract<SaveProductResult, { ok: true }>).entry, 201);
  });

  app.put("/products/:id", need("products"), async (c) => {
    const deps = c.get("deps");
    const b = await body(c, ProductInputSchema);
    if (!b.ok) return b.res;
    const r = await deps.store.saveProduct(param(c, "id"), b.data, nowIso(c), "update");
    const problem = savedOrProblem(c, r);
    if (problem) return problem;
    rebuildLater(deps, "product saved");
    return c.json((r as Extract<SaveProductResult, { ok: true }>).entry);
  });

  app.patch("/variants/:id", need("products"), async (c) => {
    const deps = c.get("deps");
    const id = variantIdSchema.safeParse(param(c, "id"));
    if (!id.success) return c.json({ message: "Not found" }, 404);
    const b = await body(c, StockPatchSchema);
    if (!b.ok) return b.res;
    const r = await deps.store.setStock(id.data, b.data);
    const problem = savedOrProblem(c, r);
    if (problem) return problem;
    rebuildLater(deps, "stock changed");
    return c.json((r as Extract<StockResult, { ok: true }>).variant);
  });

  /* ---------- Photos (resized in her browser, stored in R2) ---------- */

  app.put("/images/:imageId/:file", need("products"), async (c) => {
    const { images } = c.get("deps");
    if (!images) return c.json({ message: "Photo storage isn't configured (R2 bucket missing)." }, 503);
    const imageId = param(c, "imageId");
    const file = IMAGE_FILE.exec(param(c, "file"));
    if (!IMAGE_ID.test(imageId) || !file) return c.json({ message: "Bad image name" }, 400);
    const ext = file[2] as "avif" | "webp";
    if (c.req.header("content-type") !== `image/${ext}`) return c.json({ message: `Expected image/${ext}` }, 415);
    const declared = Number(c.req.header("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) return c.json({ message: "Photo too large" }, 413);
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) return c.json({ message: "Photo too large" }, 413);
    if (!looksLike(ext, bytes)) return c.json({ message: `That isn't a ${ext.toUpperCase()} file` }, 415);
    await images.put(`products/${imageId}/${file[0]}`, bytes, {
      httpMetadata: { contentType: `image/${ext}`, cacheControl: "public, max-age=31536000, immutable" },
    });
    return c.json({ key: `products/${imageId}` }, 201);
  });

  /* ---------- Push alerts ---------- */

  app.post("/push/tokens", async (c) => {
    const b = await body(c, PushTokenSchema);
    if (!b.ok) return b.res;
    await c.get("deps").store.addPushToken(b.data.token);
    return c.json({ ok: true, pushConfigured: Boolean(c.get("deps").push) });
  });

  app.delete("/push/tokens", async (c) => {
    const b = await body(c, PushTokenSchema);
    if (!b.ok) return b.res;
    await c.get("deps").store.removePushTokens([b.data.token]);
    return c.json({ ok: true });
  });

  /** Sends a test alert to every registered phone, so she can check alerts work before a real order. */
  app.post("/push/test", async (c) => {
    const deps = c.get("deps");
    if (!deps.push) return c.json({ message: "Push isn't configured yet (Firebase service account missing)." }, 503);
    const settings = await deps.store.getSettings();
    const r = await deps.push.send(settings.notificationTargets.pushTokens, {
      title: "Test alert · Harries Vogue",
      body: "Alerts for new orders will arrive like this.",
      url: "/",
      tag: "test",
    });
    if (r.dead.length) await deps.store.removePushTokens(r.dead);
    return c.json({ sent: r.sent, devices: settings.notificationTargets.pushTokens.length - r.dead.length });
  });

  /* ---------- Local development only ---------- */

  app.post("/dev/sample-orders", async (c) => {
    const deps = c.get("deps");
    if (!deps.placeholderData) return c.json({ message: "Not found" }, 404);
    const orders = await seedSampleOrders(deps);
    for (const o of orders.slice(0, 1)) await alertOwner(deps, o).catch(() => undefined);
    rebuildLater(deps, "sample orders");
    return c.json({ created: orders.length, latest: orders[0] ? orderPaidPush(orders[0]) : null });
  });

  return app;
}
