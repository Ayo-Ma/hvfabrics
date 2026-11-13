import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaystackClient } from "@hv/core";
import { FirebaseVerifier } from "./auth/firebase";
import { ResendNotifier } from "./services/notify";
import { FcmPusher } from "./services/push";
import { FirestoreStore } from "./store/firestore";
import { GoogleAuth } from "./store/google-auth";

/**
 * Regression: on Cloudflare Workers the global `fetch` throws "Illegal invocation" when it's
 * stored on an object and called as a method (`this.fetchImpl(...)`). Every client's default
 * must call it unbound. This stub behaves like the Workers runtime.
 */
function workersLikeFetch(this: unknown, ..._args: unknown[]): Promise<Response> {
  if (this !== undefined && this !== globalThis) {
    return Promise.reject(new TypeError("Illegal invocation: function called with incorrect `this` reference."));
  }
  return Promise.resolve(Response.json({ access_token: "t", expires_in: 3600, keys: [], status: true, data: {} }));
}

afterEach(() => vi.unstubAllGlobals());

describe("clients' default fetch", () => {
  it("is called without a `this`, as Workers requires", async () => {
    vi.stubGlobal("fetch", workersLikeFetch);
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const sa = { project_id: "p", client_email: "w@p.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };

    // Each call must get past fetch itself; any later failure is about the fake response, not `this`.
    const notIllegal = (p: Promise<unknown>) =>
      p.then(
        () => undefined,
        (e: unknown) => expect(String(e)).not.toMatch(/Illegal invocation/),
      );

    await notIllegal(new GoogleAuth(sa).accessToken());
    await notIllegal(new FirestoreStore("p", { accessToken: async () => "t" } as unknown as GoogleAuth).getSettings());
    // A well-formed token, so the verifier gets as far as fetching Google's keys.
    const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const jwt = `${part({ alg: "RS256", kid: "k" })}.${part({ aud: "p", iss: "x", sub: "u", exp: 9e9, iat: 1 })}.c2ln`;
    await notIllegal(new FirebaseVerifier("p").verify(`Bearer ${jwt}`));
    await notIllegal(new FcmPusher("p", { accessToken: async () => "t" }).send(["x"], { title: "", body: "", url: "/", tag: "t" }));
    await notIllegal(new PaystackClient("sk_test").verify("ref"));
    await notIllegal(
      new ResendNotifier("re_x", "a@b.co", "https://shop").orderPaid(
        {
          id: "o",
          number: "HV-1",
          customer: { name: "A", email: "a@b.co", phone: "1" },
          items: [],
          delivery: { zone: "z", address: "a", fee: { amount: 0, currency: "NGN" } },
          totals: { subtotal: { amount: 0, currency: "NGN" }, delivery: { amount: 0, currency: "NGN" }, total: { amount: 0, currency: "NGN" } },
          currency: "NGN",
          status: "paid",
          createdAt: "2026-11-13T00:00:00Z",
        },
        { deliveryZones: [], storeAddress: "", policies: { delivery: "", returns: "", privacy: "" }, notificationTargets: { emails: [], pushTokens: [] } },
      ),
    );
  });
});
