import { z } from "zod";

/**
 * Paystack client for Workers (fetch + WebCrypto only).
 * Docs: https://paystack.com/docs/api/transaction/ and /payments/webhooks/
 */

const API = "https://api.paystack.co";

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies `x-paystack-signature`: HMAC SHA-512 of the raw request body with the secret key. */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return timingSafeEqual(hex(mac), signature.toLowerCase());
}

export const WebhookEventSchema = z.object({
  event: z.string(),
  data: z
    .object({
      reference: z.string(),
      status: z.string().optional(),
      amount: z.number().int().optional(),
      currency: z.string().optional(),
    })
    .loose(),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

const InitializeResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    authorization_url: z.url(),
    access_code: z.string(),
    reference: z.string(),
  }),
});

const VerifyResponseSchema = z.object({
  status: z.boolean(),
  data: z
    .object({
      reference: z.string(),
      status: z.string(),
      amount: z.number().int(),
      currency: z.string(),
      paid_at: z.string().nullable().optional(),
    })
    .loose(),
});
export type VerifiedTransaction = z.infer<typeof VerifyResponseSchema>["data"];

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

export class PaystackClient {
  constructor(
    private readonly secretKey: string,
    // Wrapped: on Workers, calling a stored `fetch` as a method throws "Illegal invocation".
    private readonly fetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args),
  ) {}

  private async call<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
    const res = await this.fetchImpl(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body as { message?: string } | null)?.message ?? res.statusText;
      throw new PaystackError(`Paystack ${path}: ${msg}`, res.status);
    }
    return schema.parse(body);
  }

  /** Amount in the smallest unit (kobo). Reference = our order id. */
  initialize(input: {
    email: string;
    amount: number;
    currency: "NGN" | "USD";
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.call(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      },
      InitializeResponseSchema,
    ).then((r) => r.data);
  }

  verify(reference: string) {
    return this.call(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" },
      VerifyResponseSchema,
    ).then((r) => r.data);
  }
}
