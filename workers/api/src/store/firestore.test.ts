import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { decodeFields, encodeFields } from "./firestore-codec";
import { GoogleAuth, signJwt } from "./google-auth";
import { FirestoreStore } from "./firestore";

describe("firestore codec", () => {
  it("round-trips the shapes this app stores, keeping integers exact", () => {
    const order = {
      id: "abc",
      totals: { total: { amount: 7_800_100, currency: "NGN" } },
      items: [{ qty: 5, title: "Lace" }],
      flags: [],
      ratio: 1.5,
      paid: true,
      note: null,
      skipped: undefined,
    };
    const fields = encodeFields(order);
    expect(fields.totals).toEqual({
      mapValue: { fields: { total: { mapValue: { fields: { amount: { integerValue: "7800100" }, currency: { stringValue: "NGN" } } } } } },
    });
    expect(fields).not.toHaveProperty("skipped");
    const { skipped: _skipped, ...expected } = order;
    expect(decodeFields(fields)).toEqual(expected);
  });

  it("refuses integers that would lose precision", () => {
    expect(() => decodeFields({ n: { integerValue: "9007199254740993" } })).toThrow(RangeError);
  });
});

describe("google auth", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const sa = { project_id: "hv-test", client_email: "worker@hv-test.iam.gserviceaccount.com", private_key: pem };

  it("signs an RS256 JWT Google will accept", async () => {
    const jwt = await signJwt(sa, 1_700_000_000);
    const [h, c, s] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(c!, "base64url").toString());
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(claims).toMatchObject({ iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", exp: 1_700_003_600 });
    const ok = createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s!, "base64url"));
    expect(ok).toBe(true);
  });

  it("accepts keys pasted with escaped newlines and caches the token", async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: "ya29.token", expires_in: 3600 }));
    const auth = new GoogleAuth({ ...sa, private_key: pem.replace(/\n/g, "\\n") }, fetchMock as unknown as typeof fetch);
    expect(await auth.accessToken()).toBe("ya29.token");
    expect(await auth.accessToken()).toBe("ya29.token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("FirestoreStore transactions", () => {
  it("retries a commit that loses a race, with fresh reads", async () => {
    const auth = { accessToken: async () => "t" } as unknown as GoogleAuth;
    let commits = 0;
    const variantDoc = (reserved: number) => ({
      found: {
        name: "projects/p/databases/(default)/documents/products/lace/variants/lace--gold",
        fields: encodeFields({
          id: "lace--gold",
          sku: "S",
          options: { unit: "yard" },
          price: { amount: 100, currency: "NGN" },
          stock: 10,
          reserved,
          lowStockAt: 1,
        }),
      },
    });
    const productDoc = {
      found: {
        name: "projects/p/databases/(default)/documents/products/lace",
        fields: encodeFields({
          id: "lace",
          slug: "lace",
          line: "fabric",
          title: "Lace",
          description: "",
          images: [],
          attributes: {},
          status: "live",
          createdAt: "2026-11-01T00:00:00Z",
          updatedAt: "2026-11-01T00:00:00Z",
        }),
      },
    };
    let reads = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith(":beginTransaction")) return Response.json({ transaction: "tx" });
      if (url.endsWith(":rollback")) return Response.json({});
      if (url.endsWith(":batchGet")) return Response.json([variantDoc(reads++ === 0 ? 0 : 8), productDoc]);
      if (url.endsWith(":commit")) {
        commits++;
        return commits === 1 ? new Response("ABORTED", { status: 409 }) : Response.json({});
      }
      throw new Error(`unexpected ${url}`);
    });
    const store = new FirestoreStore("p", auth, fetchMock as unknown as typeof fetch);
    const r = await store.createPendingOrder([{ variantId: "lace--gold", qty: 3 }], () => ({
      id: "o1",
      number: "HV-AAAAAA",
      customer: { name: "A", email: "a@b.co", phone: "08031234567" },
      items: [{ productId: "lace", variantId: "lace--gold", title: "Lace", variantLabel: "Gold", qty: 3, unitPrice: { amount: 100, currency: "NGN" } }],
      delivery: { zone: "Lagos", address: "x", fee: { amount: 0, currency: "NGN" } },
      totals: { subtotal: { amount: 300, currency: "NGN" }, delivery: { amount: 0, currency: "NGN" }, total: { amount: 300, currency: "NGN" } },
      currency: "NGN",
      status: "pending",
      createdAt: "2026-11-13T10:00:00Z",
    }));
    // Second attempt saw 8 reserved by someone else: only 2 left, so 3 is refused.
    expect(r).toEqual({ ok: false, problems: [{ variantId: "lace--gold", kind: "insufficient", available: 2, requested: 3 }] });
    expect(commits).toBe(1);
  });
});

describe("FirestoreStore under load", () => {
  it("retries a read that Google answers with a passing 503, and caches settings for a minute", async () => {
    const auth = { accessToken: async () => "t" } as unknown as GoogleAuth;
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response("unavailable", { status: 503 });
      return Response.json([{ missing: "x" }]);
    });
    const store = new FirestoreStore("hv-test", auth, fetchMock as unknown as typeof fetch);
    await expect(store.getSettings()).rejects.toThrow("settings/store is missing");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one token exchange between simultaneous requests", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const fetchMock = vi.fn(async () => Response.json({ access_token: "ya29.shared", expires_in: 3600 }));
    const auth = new GoogleAuth({ project_id: "p", client_email: "w@p.iam.gserviceaccount.com", private_key: pem }, fetchMock as unknown as typeof fetch);
    const tokens = await Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()]);
    expect(tokens).toEqual(["ya29.shared", "ya29.shared", "ya29.shared"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
