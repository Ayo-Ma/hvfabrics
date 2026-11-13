import {
  CustomerSchema,
  OrderSchema,
  ProductSchema,
  SettingsSchema,
  VariantSchema,
  productIdOfVariant,
  type BagLine,
  type Customer,
  type Order,
  type OrderStatus,
  type Product,
  type ProductInput,
  type Settings,
  type StockPatch,
  type Variant,
} from "@hv/core";
import { decodeFields, encodeFields, encodeValue, type FsFields } from "./firestore-codec";
import type { GoogleAuth } from "./google-auth";
import { planCancel, planMove, planPayment, planProductSave, planReservation, planStock, variantIdsOf, withPushToken } from "./logic";
import {
  customerId,
  type CreateOrderResult,
  type Entry,
  type MarkPaidResult,
  type MoveResult,
  type SaveProductResult,
  type StockResult,
  type Store,
  type VariantWithProduct,
} from "./types";

/**
 * Firestore over its REST API (PLAN.md: Workers call Firestore's REST API with a
 * service-account token). Stock changes run in Firestore transactions; a commit that
 * loses a race (ABORTED/409) is retried from the start with fresh reads.
 *
 * Layout: products/{id}, products/{id}/variants/{variantId}, orders/{id},
 * customers/{lower-cased email}, settings/store.
 */

interface FsDoc {
  name: string;
  fields?: FsFields;
}

type Write = { update: { name: string; fields: FsFields } } | { delete: string };

class TxConflict extends Error {}

const MAX_ATTEMPTS = 5;

export class FirestoreStore implements Store {
  private readonly root: string;
  private readonly base: string;

  constructor(
    projectId: string,
    private readonly auth: GoogleAuth,
    // Wrapped: on Workers, calling a stored `fetch` as a method throws "Illegal invocation".
    private readonly fetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args),
  ) {
    this.root = `projects/${projectId}/databases/(default)/documents`;
    this.base = `https://firestore.googleapis.com/v1/${this.root}`;
  }

  /* ---------------- low level ---------------- */

  private name(path: string): string {
    return `${this.root}/${path
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/")}`;
  }

  private async call<T>(url: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${await this.auth.accessToken()}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (res.status === 409) throw new TxConflict(await res.text());
    if (!res.ok) throw new Error(`Firestore ${method} ${url.replace(this.base, "")}: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  private async batchGet(names: string[], transaction?: string): Promise<Map<string, Record<string, unknown>>> {
    const out = new Map<string, Record<string, unknown>>();
    if (names.length === 0) return out;
    const rows = await this.call<{ found?: FsDoc; missing?: string }[]>(`${this.base}:batchGet`, {
      documents: names,
      ...(transaction ? { transaction } : {}),
    });
    for (const r of rows) if (r.found) out.set(r.found.name, decodeFields(r.found.fields ?? {}));
    return out;
  }

  private async runQuery(structuredQuery: unknown, parent = ""): Promise<FsDoc[]> {
    const url = `${this.base}${parent ? `/${parent.split("/").map(encodeURIComponent).join("/")}` : ""}:runQuery`;
    const rows = await this.call<{ document?: FsDoc }[]>(url, { structuredQuery });
    return rows.flatMap((r) => (r.document ? [r.document] : []));
  }

  /** Runs `fn` in a transaction, retrying on contention. `fn` must be free of side effects other than its returned writes. */
  private async transact<T>(fn: (read: (names: string[]) => Promise<Map<string, Record<string, unknown>>>) => Promise<{ result: T; writes: Write[] }>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { transaction } = await this.call<{ transaction: string }>(`${this.base}:beginTransaction`, {
        options: { readWrite: {} },
      });
      try {
        const { result, writes } = await fn((names) => this.batchGet(names, transaction));
        if (writes.length === 0) {
          await this.call(`${this.base}:rollback`, { transaction }).catch(() => undefined);
          return result;
        }
        await this.call(`${this.base}:commit`, { writes, transaction });
        return result;
      } catch (e) {
        lastError = e;
        await this.call(`${this.base}:rollback`, { transaction }).catch(() => undefined);
        if (!(e instanceof TxConflict)) throw e;
        await new Promise((r) => setTimeout(r, 20 * 2 ** attempt + Math.random() * 20));
      }
    }
    throw new Error(`Firestore transaction kept conflicting: ${String(lastError)}`);
  }

  private variantDoc(id: string) {
    return this.name(`products/${productIdOfVariant(id)}/variants/${id}`);
  }

  private write(path: string, data: object): Write {
    return { update: { name: this.name(path), fields: encodeFields(data as Record<string, unknown>) } };
  }

  private variantWrite(v: Variant): Write {
    return this.write(`products/${productIdOfVariant(v.id)}/variants/${v.id}`, v);
  }

  /* ---------------- Store ---------------- */

  async listCatalogueEntries() {
    const productDocs = await this.runQuery({
      from: [{ collectionId: "products" }],
      where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: encodeValue("live") } },
    });
    const variantDocs = await this.runQuery({ from: [{ collectionId: "variants", allDescendants: true }] });
    const byProduct = new Map<string, Variant[]>();
    for (const d of variantDocs) {
      const v = VariantSchema.parse(decodeFields(d.fields ?? {}));
      const pid = productIdOfVariant(v.id);
      byProduct.set(pid, [...(byProduct.get(pid) ?? []), v]);
    }
    return productDocs.map((d) => {
      const product = ProductSchema.parse(decodeFields(d.fields ?? {}));
      return { product, variants: byProduct.get(product.id) ?? [] };
    });
  }

  async getSettings() {
    const docs = await this.batchGet([this.name("settings/store")]);
    const raw = docs.get(this.name("settings/store"));
    if (!raw) throw new Error("settings/store is missing in Firestore");
    return SettingsSchema.parse(raw);
  }

  async createPendingOrder(lines: BagLine[], makeOrder: (v: Map<string, VariantWithProduct>) => Order): Promise<CreateOrderResult> {
    const ids = [...new Set(lines.map((l) => l.variantId))];
    return this.transact<CreateOrderResult>(async (read) => {
      const productNames = [...new Set(ids.map((id) => this.name(`products/${productIdOfVariant(id)}`)))];
      const docs = await read([...ids.map((id) => this.variantDoc(id)), ...productNames]);
      const found = new Map<string, VariantWithProduct>();
      for (const id of ids) {
        const vRaw = docs.get(this.variantDoc(id));
        const pRaw = docs.get(this.name(`products/${productIdOfVariant(id)}`));
        if (!vRaw || !pRaw) continue;
        const product: Product = ProductSchema.parse(pRaw);
        found.set(id, {
          variant: VariantSchema.parse(vRaw),
          productId: product.id,
          productTitle: product.title,
          productStatus: product.status,
        });
      }
      const plan = planReservation(lines, found);
      if (!plan.ok) return { result: plan, writes: [] };
      const order = makeOrder(found);
      return {
        result: { ok: true, order },
        writes: [...plan.reserved.map((v) => this.variantWrite(v)), this.write(`orders/${order.id}`, order)],
      };
    });
  }

  async markPaid(orderId: string, paidAt: string): Promise<MarkPaidResult | null> {
    return this.transact<MarkPaidResult | null>(async (read) => {
      const orderName = this.name(`orders/${orderId}`);
      const first = await read([orderName]);
      const raw = first.get(orderName);
      if (!raw) return { result: null, writes: [] };
      const order = OrderSchema.parse(raw);
      const cid = customerId(order.customer.email);
      const customerName = this.name(`customers/${cid}`);
      const ids = variantIdsOf(order);
      const docs = await read([...ids.map((id) => this.variantDoc(id)), customerName]);
      const variants = new Map<string, Variant>();
      for (const id of ids) {
        const v = docs.get(this.variantDoc(id));
        if (v) variants.set(id, VariantSchema.parse(v));
      }
      const cRaw = docs.get(customerName);
      const customer: Customer | null = cRaw ? CustomerSchema.parse(cRaw) : null;
      const plan = planPayment(order, variants, customer, paidAt);
      if (!plan.changed) return { result: { order, changed: false }, writes: [] };
      return {
        result: { order: plan.order, changed: true },
        writes: [
          ...plan.variants.map((v) => this.variantWrite(v)),
          this.write(`orders/${orderId}`, plan.order),
          this.write(`customers/${cid}`, plan.customer),
        ],
      };
    });
  }

  async cancelPending(orderId: string, at: string): Promise<Order | null> {
    return this.transact<Order | null>(async (read) => {
      const orderName = this.name(`orders/${orderId}`);
      const raw = (await read([orderName])).get(orderName);
      if (!raw) return { result: null, writes: [] };
      const order = OrderSchema.parse(raw);
      const ids = variantIdsOf(order);
      const docs = await read(ids.map((id) => this.variantDoc(id)));
      const variants = new Map<string, Variant>();
      for (const id of ids) {
        const v = docs.get(this.variantDoc(id));
        if (v) variants.set(id, VariantSchema.parse(v));
      }
      const plan = planCancel(order, variants, at);
      if (!plan.changed) return { result: order, writes: [] };
      return {
        result: plan.order,
        writes: [...plan.variants.map((v) => this.variantWrite(v)), this.write(`orders/${orderId}`, plan.order)],
      };
    });
  }

  /** Needs the composite index in workers/api/firestore.indexes.json (status ASC, reservedUntil ASC). */
  async expireOverdue(now: string): Promise<number> {
    const docs = await this.runQuery({
      from: [{ collectionId: "orders" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: encodeValue("pending") } },
            { fieldFilter: { field: { fieldPath: "reservedUntil" }, op: "LESS_THAN", value: encodeValue(now) } },
          ],
        },
      },
      limit: 100,
    });
    let n = 0;
    for (const d of docs) {
      const id = String(decodeFields(d.fields ?? {}).id);
      const r = await this.cancelPending(id, now);
      if (r?.status === "cancelled") n++;
    }
    return n;
  }

  async getOrder(orderId: string) {
    const name = this.name(`orders/${orderId}`);
    const raw = (await this.batchGet([name])).get(name);
    return raw ? OrderSchema.parse(raw) : null;
  }

  async getOrderByNumber(number: string) {
    const [doc] = await this.runQuery({
      from: [{ collectionId: "orders" }],
      where: { fieldFilter: { field: { fieldPath: "number" }, op: "EQUAL", value: encodeValue(number) } },
      limit: 1,
    });
    return doc ? OrderSchema.parse(decodeFields(doc.fields ?? {})) : null;
  }

  async getCustomer(id: string) {
    const name = this.name(`customers/${id}`);
    const raw = (await this.batchGet([name])).get(name);
    return raw ? CustomerSchema.parse(raw) : null;
  }

  /* ---------------- Dashboard ---------------- */

  private entriesFrom(productDocs: FsDoc[], variantDocs: FsDoc[]): Entry[] {
    const byProduct = new Map<string, Variant[]>();
    for (const d of variantDocs) {
      const v = VariantSchema.parse(decodeFields(d.fields ?? {}));
      const pid = productIdOfVariant(v.id);
      byProduct.set(pid, [...(byProduct.get(pid) ?? []), v]);
    }
    return productDocs.map((d) => {
      const product = ProductSchema.parse(decodeFields(d.fields ?? {}));
      return { product, variants: byProduct.get(product.id) ?? [] };
    });
  }

  async listAllEntries(): Promise<Entry[]> {
    const [productDocs, variantDocs] = await Promise.all([
      this.runQuery({ from: [{ collectionId: "products" }] }),
      this.runQuery({ from: [{ collectionId: "variants", allDescendants: true }] }),
    ]);
    return this.entriesFrom(productDocs, variantDocs);
  }

  private async variantNames(productId: string): Promise<string[]> {
    const docs = await this.runQuery({ from: [{ collectionId: "variants" }], select: { fields: [] } }, `products/${productId}`);
    return docs.map((d) => d.name);
  }

  async getEntry(productId: string): Promise<Entry | null> {
    const name = this.name(`products/${productId}`);
    const [docs, variantDocs] = await Promise.all([
      this.batchGet([name]),
      this.runQuery({ from: [{ collectionId: "variants" }] }, `products/${productId}`),
    ]);
    const raw = docs.get(name);
    if (!raw) return null;
    return this.entriesFrom([{ name, fields: encodeFields(raw) }], variantDocs)[0] ?? null;
  }

  async saveProduct(productId: string, input: ProductInput, now: string, mode: "create" | "update"): Promise<SaveProductResult> {
    const [slugDocs, existingVariantNames] = await Promise.all([
      this.runQuery({
        from: [{ collectionId: "products" }],
        where: { fieldFilter: { field: { fieldPath: "slug" }, op: "EQUAL", value: encodeValue(input.slug) } },
        limit: 2,
      }),
      this.variantNames(productId),
    ]);
    const slugOwner = slugDocs.map((d) => String(decodeFields(d.fields ?? {}).id)).find((id) => id !== productId) ?? null;
    const productName = this.name(`products/${productId}`);

    return this.transact<SaveProductResult>(async (read) => {
      const docs = await read([productName, ...existingVariantNames]);
      const pRaw = docs.get(productName);
      const existing: Entry | null = pRaw
        ? {
            product: ProductSchema.parse(pRaw),
            variants: existingVariantNames.flatMap((n) => {
              const v = docs.get(n);
              return v ? [VariantSchema.parse(v)] : [];
            }),
          }
        : null;
      const plan = planProductSave(productId, input, existing, slugOwner, now, mode);
      if (!plan.ok) return { result: plan, writes: [] };
      return {
        result: { ok: true, entry: plan.entry },
        writes: [
          this.write(`products/${productId}`, plan.entry.product),
          ...plan.entry.variants.map((v) => this.variantWrite(v)),
          ...plan.deleted.map((id): Write => ({ delete: this.variantDoc(id) })),
        ],
      };
    });
  }

  async setStock(variantId: string, patch: StockPatch): Promise<StockResult> {
    return this.transact<StockResult>(async (read) => {
      const name = this.variantDoc(variantId);
      const raw = (await read([name])).get(name);
      const plan = planStock(raw ? VariantSchema.parse(raw) : undefined, patch);
      return { result: plan, writes: plan.ok ? [this.variantWrite(plan.variant)] : [] };
    });
  }

  /** Needs the composite index (status ASC, paidAt DESC) in firestore.indexes.json. */
  async listOrders(statuses: readonly OrderStatus[], limit: number): Promise<Order[]> {
    const docs = await this.runQuery({
      from: [{ collectionId: "orders" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "status" },
          op: "IN",
          value: { arrayValue: { values: statuses.map((st) => encodeValue(st)) } },
        },
      },
      orderBy: [{ field: { fieldPath: "paidAt" }, direction: "DESCENDING" }],
      limit,
    });
    return docs.map((d) => OrderSchema.parse(decodeFields(d.fields ?? {})));
  }

  async listPaidSince(since: string, limit: number): Promise<Order[]> {
    const docs = await this.runQuery({
      from: [{ collectionId: "orders" }],
      where: { fieldFilter: { field: { fieldPath: "paidAt" }, op: "GREATER_THAN_OR_EQUAL", value: encodeValue(since) } },
      orderBy: [{ field: { fieldPath: "paidAt" }, direction: "DESCENDING" }],
      limit,
    });
    return docs.map((d) => OrderSchema.parse(decodeFields(d.fields ?? {})));
  }

  async moveOrder(orderId: string, to: OrderStatus, at: string): Promise<MoveResult> {
    return this.transact<MoveResult>(async (read) => {
      const name = this.name(`orders/${orderId}`);
      const raw = (await read([name])).get(name);
      const plan = planMove(raw ? OrderSchema.parse(raw) : null, to, at);
      return { result: plan, writes: plan.ok ? [this.write(`orders/${orderId}`, plan.order)] : [] };
    });
  }

  private async updateSettings(change: (s: Settings) => void): Promise<void> {
    const name = this.name("settings/store");
    await this.transact<void>(async (read) => {
      const raw = (await read([name])).get(name);
      if (!raw) throw new Error("settings/store is missing in Firestore");
      const settings = SettingsSchema.parse(raw);
      change(settings);
      return { result: undefined, writes: [this.write("settings/store", settings)] };
    });
  }

  async addPushToken(token: string): Promise<void> {
    await this.updateSettings((s) => {
      s.notificationTargets.pushTokens = withPushToken(s.notificationTargets.pushTokens, token);
    });
  }

  async removePushTokens(tokens: readonly string[]): Promise<void> {
    await this.updateSettings((s) => {
      s.notificationTargets.pushTokens = s.notificationTargets.pushTokens.filter((t) => !tokens.includes(t));
    });
  }
}
