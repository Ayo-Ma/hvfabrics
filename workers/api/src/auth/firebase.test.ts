import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { DevVerifier, FirebaseVerifier, JWKS_URL } from "./firebase";

const PROJECT = "harries-vogue";
const NOW = 1_800_000_000;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as { n: string; e: string };

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function token(claims: Record<string, unknown> = {}, opts: { kid?: string; key?: typeof privateKey; alg?: string } = {}) {
  const header = b64({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" });
  const body = b64({
    aud: PROJECT,
    iss: `https://securetoken.google.com/${PROJECT}`,
    sub: "uid-123",
    iat: NOW - 10,
    auth_time: NOW - 10,
    exp: NOW + 3600,
    email: "her@example.com",
    admin: true,
    role: "owner",
    ...claims,
  });
  const sig = createSign("RSA-SHA256").update(`${header}.${body}`).sign(opts.key ?? privateKey).toString("base64url");
  return `Bearer ${header}.${body}.${sig}`;
}

function verifier() {
  const fetchMock = vi.fn(async (url: string) => {
    expect(url).toBe(JWKS_URL);
    return Response.json({ keys: [{ kid: "k1", kty: "RSA", alg: "RS256", use: "sig", n: jwk.n, e: jwk.e }] }, {
      headers: { "Cache-Control": "public, max-age=19000, must-revalidate" },
    });
  });
  return { v: new FirebaseVerifier(PROJECT, fetchMock as unknown as typeof fetch, () => NOW), fetchMock };
}

describe("FirebaseVerifier", () => {
  it("accepts a valid admin token and caches Google's keys", async () => {
    const { v, fetchMock } = verifier();
    expect(await v.verify(token())).toEqual({ ok: true, user: { uid: "uid-123", email: "her@example.com", role: "owner" } });
    await v.verify(token({ role: "packer" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses tokens that are forged, expired, for another project or of the wrong type", async () => {
    const { v } = verifier();
    const status = async (auth: string | undefined) => {
      const r = await v.verify(auth);
      return r.ok ? 200 : r.status;
    };
    expect(await status(undefined)).toBe(401);
    expect(await status("Bearer not.a.jwt.at.all")).toBe(401);
    expect(await status(token({}, { key: other.privateKey }))).toBe(401);
    expect(await status(token({ exp: NOW - 1 }))).toBe(401);
    expect(await status(token({ aud: "someone-else" }))).toBe(401);
    expect(await status(token({ iss: "https://securetoken.google.com/someone-else" }))).toBe(401);
    expect(await status(token({ iat: NOW + 3600 }))).toBe(401);
    expect(await status(token({}, { alg: "HS256" }))).toBe(401);
    expect(await status(token({}, { kid: "unknown" }))).toBe(401);
  });

  it("refuses signed-in users who aren't admins", async () => {
    const { v } = verifier();
    expect(await v.verify(token({ admin: false }))).toMatchObject({ ok: false, status: 403 });
    expect(await v.verify(token({ role: "superuser" }))).toMatchObject({ ok: false, status: 403 });
    expect(await v.verify(token({ admin: undefined, role: undefined }))).toMatchObject({ ok: false, status: 403 });
  });
});

describe("DevVerifier", () => {
  it("accepts only dev:<role> tokens", async () => {
    const v = new DevVerifier();
    expect(await v.verify("Bearer dev:manager")).toMatchObject({ ok: true, user: { role: "manager" } });
    expect(await v.verify("Bearer dev:root")).toMatchObject({ ok: false });
    expect(await v.verify(token())).toMatchObject({ ok: false });
  });
});
