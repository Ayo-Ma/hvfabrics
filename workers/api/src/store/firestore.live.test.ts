import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Order, ProductInput } from "@hv/core";
import { FirestoreStore } from "./firestore";
import { GoogleAuth, ServiceAccountSchema } from "./google-auth";

/**
 * PLAN.md: "Stock is correct after 20 concurrent test purchases of the last few units" —
 * against the REAL Firestore, where the guarantee actually lives (the in-memory test proves the
 * logic, this proves the transactions). Opt-in only:
 *
 *   FIREBASE_SA_FILE=C:/Users/USER/hv-secrets/firebase-service-account.json corepack pnpm exec vitest run src/store/firestore.live.test.ts
 *
 * It creates a throwaway product (never put in the shop's catalogue), runs the race, then deletes
 * the product, its variant and every order it made.
 */

const file = process.env.FIREBASE_SA_FILE;

describe.skipIf(!file)("Firestore, live: 20 buyers race for the last 5 units", () => {
  it("sells exactly 5, holds exactly 5, refuses the other 15 and oversells nothing", { timeout: 180_000 }, async () => {
    const sa = ServiceAccountSchema.parse(JSON.parse(readFileSync(file!, "utf8")));
    const auth = new GoogleAuth(sa);
    const store = new FirestoreStore(sa.project_id, auth);
    const id = `qa-race-${Date.now().toString(36)}`;
    const variantId = `${id}--v1`;
    const now = new Date().toISOString();

    const input: ProductInput = {
      slug: id,
      line: "fabric",
      title: "[QA] concurrency test — deleted after the run",
      description: "",
      images: [],
      attributes: {},
      status: "live", // checkout refuses non-live products; the catalogue is never rebuilt here, so shoppers never see it
      variants: [{ key: "v1", sku: "QA-RACE", options: { unit: "yard" }, price: { amount: 100_00, currency: "NGN" }, stock: 5, lowStockAt: 0 }],
    };
    expect((await store.saveProduct(id, input, now, "create")).ok).toBe(true);

    const made: string[] = [];
    try {
      const attempt = (i: number) =>
        store.createPendingOrder([{ variantId, qty: 1 }], (found) => {
          const v = found.get(variantId)!.variant;
          const orderId = `${id}-o${i}-${crypto.randomUUID().slice(0, 8)}`;
          const order: Order = {
            id: orderId,
            number: `QA-${i}`,
            customer: { name: "QA race", email: "qa@example.com", phone: "08030000000" },
            items: [{ productId: id, variantId, title: input.title, variantLabel: "yard", unit: "yard", qty: 1, unitPrice: v.price }],
            delivery: { zone: "QA", address: "QA", fee: { amount: 0, currency: "NGN" } },
            totals: { subtotal: v.price, delivery: { amount: 0, currency: "NGN" }, total: v.price },
            currency: "NGN",
            status: "pending",
            reservedUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
            createdAt: new Date().toISOString(),
          };
          return order;
        });

      const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => attempt(i)));
      const ok = results.flatMap((r) => (r.status === "fulfilled" && r.value.ok ? [r.value.order.id] : []));
      const refused = results.filter((r) => r.status === "fulfilled" && !r.value.ok).length;
      const errored = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
      made.push(...ok);
      console.log(`race: ${ok.length} sold, ${refused} told "sold out", ${errored.length} errors`, errored.slice(0, 2));

      const after = (await store.getEntry(id))!.variants[0]!;
      expect(ok.length).toBe(5);
      expect(after.reserved).toBe(5);
      expect(after.stock).toBe(5);
      expect(refused + errored.length).toBe(15);
    } finally {
      // Clean up: release holds, then delete everything the test created.
      for (const o of made) await store.cancelPending(o, new Date().toISOString()).catch(() => undefined);
      const token = await auth.accessToken();
      const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
      const del = (path: string) => fetch(`${base}/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await Promise.all([...made.map((o) => del(`orders/${o}`)), del(`products/${id}/variants/${variantId}`)]);
      await del(`products/${id}`);
    }
  });
});
