import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PaystackClient, PaystackError, verifyWebhookSignature } from "./paystack";

const SECRET = "sk_test_example";
const body = JSON.stringify({ event: "charge.success", data: { reference: "HV-123", amount: 500000 } });
const goodSig = createHmac("sha512", SECRET).update(body).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts a correct signature", async () => {
    expect(await verifyWebhookSignature(body, goodSig, SECRET)).toBe(true);
    expect(await verifyWebhookSignature(body, goodSig.toUpperCase(), SECRET)).toBe(true);
  });

  it("rejects a missing, wrong or tampered signature", async () => {
    expect(await verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, "deadbeef", SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body + " ", goodSig, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, goodSig, "sk_test_other")).toBe(false);
  });
});

describe("PaystackClient", () => {
  it("initialises a transaction with the amount in kobo", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/abc", access_code: "abc", reference: "HV-1" },
      }),
    );
    const client = new PaystackClient(SECRET, fetchMock as unknown as typeof fetch);
    const r = await client.initialize({
      email: "a@b.co",
      amount: 2_250_000,
      currency: "NGN",
      reference: "HV-1",
      callbackUrl: "https://example.com/checkout/return",
    });
    expect(r.reference).toBe("HV-1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(JSON.parse(init.body as string)).toMatchObject({ amount: 2_250_000, reference: "HV-1" });
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
  });

  it("throws PaystackError on API errors", async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: false, message: "Invalid key" }, { status: 401 }));
    const client = new PaystackClient(SECRET, fetchMock as unknown as typeof fetch);
    await expect(client.verify("HV-1")).rejects.toBeInstanceOf(PaystackError);
  });
});
