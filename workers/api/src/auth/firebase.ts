import { AdminRoleSchema, type AdminRole } from "@hv/core";
import { z } from "zod";

/**
 * Verifies Firebase Auth ID tokens on Workers with WebCrypto (the Admin SDK doesn't run here).
 * Rules from Firebase's "verify ID tokens using a third-party JWT library":
 * RS256, a `kid` from Google's securetoken keys, aud = project id,
 * iss = https://securetoken.google.com/<project id>, not expired, issued in the past, a subject.
 * Dashboard access additionally needs the custom claims `admin: true` and a `role` (PLAN.md).
 */

export interface AdminUser {
  uid: string;
  email?: string;
  role: AdminRole;
}

export type VerifyResult = { ok: true; user: AdminUser } | { ok: false; status: 401 | 403; message: string };

export interface AdminVerifier {
  verify(authorization: string | undefined): Promise<VerifyResult>;
}

export const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const JwkSchema = z.object({ kid: z.string(), kty: z.literal("RSA"), n: z.string(), e: z.string() });
const JwksSchema = z.object({ keys: z.array(JwkSchema) });

const ClaimsSchema = z.object({
  aud: z.string(),
  iss: z.string(),
  sub: z.string().min(1).max(128),
  exp: z.number(),
  iat: z.number(),
  auth_time: z.number().optional(),
  email: z.string().optional(),
  admin: z.boolean().optional(),
  role: z.string().optional(),
});

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(part)));
}

const deny = (status: 401 | 403, message: string): VerifyResult => ({ ok: false, status, message });

export class FirebaseVerifier implements AdminVerifier {
  private keys: { byKid: Map<string, CryptoKey>; expiresAt: number } | null = null;

  constructor(
    private readonly projectId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  private async key(kid: string): Promise<CryptoKey | undefined> {
    const now = this.nowSeconds();
    if (!this.keys || this.keys.expiresAt <= now || !this.keys.byKid.has(kid)) {
      const res = await this.fetchImpl(JWKS_URL);
      if (!res.ok) throw new Error(`Couldn't fetch Firebase signing keys: ${res.status}`);
      const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
      const { keys } = JwksSchema.parse(await res.json());
      const byKid = new Map<string, CryptoKey>();
      for (const k of keys) {
        byKid.set(
          k.kid,
          await crypto.subtle.importKey(
            "jwk",
            { kty: "RSA", n: k.n, e: k.e, alg: "RS256", ext: true },
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
          ),
        );
      }
      this.keys = { byKid, expiresAt: now + maxAge };
    }
    return this.keys.byKid.get(kid);
  }

  async verify(authorization: string | undefined): Promise<VerifyResult> {
    const token = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
    if (!token) return deny(401, "Sign in first");
    const parts = token.split(".");
    if (parts.length !== 3) return deny(401, "Malformed token");
    const [h, p, s] = parts as [string, string, string];

    let header: { alg?: string; kid?: string };
    let claims: z.infer<typeof ClaimsSchema>;
    try {
      header = decodeJson(h) as typeof header;
      claims = ClaimsSchema.parse(decodeJson(p));
    } catch {
      return deny(401, "Malformed token");
    }
    if (header.alg !== "RS256" || !header.kid) return deny(401, "Wrong token type");

    const key = await this.key(header.kid);
    if (!key) return deny(401, "Unknown signing key");
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlDecode(s), new TextEncoder().encode(`${h}.${p}`));
    if (!valid) return deny(401, "Bad signature");

    const now = this.nowSeconds();
    const skew = 60;
    if (claims.aud !== this.projectId) return deny(401, "Token is for another project");
    if (claims.iss !== `https://securetoken.google.com/${this.projectId}`) return deny(401, "Wrong issuer");
    if (claims.exp <= now) return deny(401, "Session expired, sign in again");
    if (claims.iat > now + skew || (claims.auth_time ?? 0) > now + skew) return deny(401, "Token from the future");

    const role = AdminRoleSchema.safeParse(claims.role);
    if (claims.admin !== true || !role.success) return deny(403, "This account isn't a Harries Vogue admin");
    return { ok: true, user: { uid: claims.sub, ...(claims.email ? { email: claims.email } : {}), role: role.data } };
  }
}

/**
 * Local development only (no Firebase project yet): `Bearer dev:<role>`.
 * index.ts installs it only when the Worker serves the in-memory placeholder store,
 * which production refuses to start with.
 */
export class DevVerifier implements AdminVerifier {
  async verify(authorization: string | undefined): Promise<VerifyResult> {
    const role = AdminRoleSchema.safeParse(/^Bearer dev:(\w+)$/.exec(authorization ?? "")?.[1]);
    if (!role.success) return deny(401, "Sign in first");
    return { ok: true, user: { uid: `dev-${role.data}`, email: `${role.data}@localhost`, role: role.data } };
  }
}
