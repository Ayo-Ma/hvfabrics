import { newOrderNumber, priceOrder, variantLabel, type BagLine, type Order, type OrderStatus, type PricingVariant } from "@hv/core";
import type { Deps } from "../deps";

/**
 * LOCAL DEVELOPMENT ONLY (the route refuses unless the Worker serves placeholder data).
 * Paid sample orders against the placeholder products, so the dashboard can be seen
 * with orders in every column. They go through the real reserve → pay → move path,
 * so stock moves exactly as it would for a real order. Names are invented samples.
 */

interface Sample {
  name: string;
  lines: BagLine[];
  /** Hours before now that payment arrived. */
  hoursAgo: number;
  status: OrderStatus;
  zone: string;
}

const SAMPLES: Sample[] = [
  { name: "Sample · Adaeze Okafor", lines: [{ variantId: "seed-fabric-1--v1", qty: 5 }], hoursAgo: 0.4, status: "paid", zone: "lagos" },
  { name: "Sample · Funmi Adeyemi", lines: [{ variantId: "seed-fabric-1--v1", qty: 3 }, { variantId: "seed-ankara-1--v2", qty: 6 }], hoursAgo: 2.2, status: "paid", zone: "lagos" },
  { name: "Sample · Chioma Eze", lines: [{ variantId: "seed-fabric-4--v2", qty: 6 }], hoursAgo: 5.5, status: "paid", zone: "abuja" },
  { name: "Sample · Bola Martins", lines: [{ variantId: "seed-rtw-1--v2", qty: 1 }], hoursAgo: 20, status: "packed", zone: "lagos" },
  { name: "Sample · Ngozi Bello", lines: [{ variantId: "seed-fabric-2--v1", qty: 4 }], hoursAgo: 30, status: "packed", zone: "abuja" },
  { name: "Sample · Kemi Lawal", lines: [{ variantId: "seed-ankara-2--v1", qty: 2 }], hoursAgo: 52, status: "shipped", zone: "lagos" },
  { name: "Sample · Amaka Nwosu", lines: [{ variantId: "seed-fabric-4--v1", qty: 10 }], hoursAgo: 75, status: "shipped", zone: "abuja" },
  { name: "Sample · Tola Ibrahim", lines: [{ variantId: "seed-rtw-3--v1", qty: 1 }], hoursAgo: 190, status: "delivered", zone: "lagos" },
];

const PATH: OrderStatus[] = ["packed", "shipped", "delivered"];

export async function seedSampleOrders(deps: Deps): Promise<Order[]> {
  const settings = await deps.store.getSettings();
  const now = deps.now().getTime();
  const made: Order[] = [];
  for (const [i, s] of SAMPLES.entries()) {
    const zone = settings.deliveryZones.find((z) => z.id === s.zone) ?? settings.deliveryZones[0];
    if (!zone) break;
    const paidAt = new Date(now - s.hoursAgo * 3_600_000);
    const created = await deps.store.createPendingOrder(s.lines, (found) => {
      const pricing = new Map<string, PricingVariant>(
        [...found].map(([id, f]) => [
          id,
          {
            id,
            productId: f.productId,
            title: f.productTitle,
            variantLabel: variantLabel({ ...f.variant.options }),
            unit: f.variant.options.unit,
            price: f.variant.price,
          },
        ]),
      );
      const priced = priceOrder(s.lines, pricing, zone);
      const id = crypto.randomUUID();
      return {
        id,
        number: newOrderNumber(),
        customer: { name: s.name, email: `sample${i + 1}@example.com`, phone: "08030000000" },
        items: priced.items,
        delivery: { zone: zone.name, address: "[Sample address], Lagos", fee: zone.fee },
        totals: priced.totals,
        currency: priced.currency,
        status: "pending",
        paystackRef: id,
        createdAt: new Date(paidAt.getTime() - 120_000).toISOString(),
        country: "NG",
        city: "Lagos",
      };
    });
    if (!created.ok) continue; // stock ran out on a re-run: skip quietly
    const paid = await deps.store.markPaid(created.order.id, paidAt.toISOString());
    if (!paid) continue;
    let order = paid.order;
    for (const step of PATH.slice(0, PATH.indexOf(s.status) + 1)) {
      const at = new Date(paidAt.getTime() + (PATH.indexOf(step) + 1) * 3 * 3_600_000).toISOString();
      const r = await deps.store.moveOrder(order.id, step, at);
      if (r.ok) order = r.order;
    }
    made.push(order);
  }
  return made;
}
