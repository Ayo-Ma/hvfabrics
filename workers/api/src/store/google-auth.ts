import { z } from "zod";

/**
 * OAuth access token for a Google service account, using only WebCrypto
 * (the Firebase Admin SDK doesn't run on Workers — PLAN.md).
 */

export const ServiceAccountSchema = z.object({
  project_id: z.string(),
  client_email: z.email(),
  private_key: z.string().includes("PRIVATE KEY"),
});
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;

/** Firestore for the store, FCM for push alerts to her phone. */
export const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/firebase.messaging"];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\\n|\s/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function signJwt(sa: ServiceAccount, nowSeconds: number, scopes: readonly string[] = DEFAULT_SCOPES): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: scopes.join(" "), aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

/** Caches the token per isolate until a minute before it expires. */
export class GoogleAuth {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly sa: ServiceAccount,
    // Wrapped: on Workers, calling a stored `fetch` as a method throws "Illegal invocation".
    private readonly fetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args),
  ) {}

  private pending: Promise<string> | null = null;

  /** Simultaneous requests in one isolate share one exchange; a passing failure is retried once. */
  async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.token.expiresAt - 60 > now) return this.token.value;
    this.pending ??= this.exchange().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async exchange(): Promise<string> {
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const now = Math.floor(Date.now() / 1000);
        const assertion = await signJwt(this.sa, now);
        const res = await this.fetchImpl(TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
        });
        if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
        const body = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await res.json());
        this.token = { value: body.access_token, expiresAt: now + body.expires_in };
        return body.access_token;
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));
      }
    }
    throw last;
  }
}
