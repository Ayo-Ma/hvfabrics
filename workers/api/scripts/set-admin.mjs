#!/usr/bin/env node
/* global process, Buffer, fetch, URLSearchParams, console */
/**
 * Gives a Firebase Auth user dashboard access (PLAN.md: admin custom claim + a role).
 *
 *   node workers/api/scripts/set-admin.mjs <service-account.json> <email> <owner|manager|packer>
 *   node workers/api/scripts/set-admin.mjs <service-account.json> <email> none      # remove access
 *
 * Create the user first (Firebase console → Authentication → Add user). The script sets the
 * custom claims { admin: true, role } and writes admins/{uid} for the Firestore rules.
 * The user must sign out and in again (or wait up to an hour) for new claims to apply.
 * The service account file never leaves your machine and must never be committed.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const [file, email, role] = process.argv.slice(2);
const ROLES = ["owner", "manager", "packer", "none"];
if (!file || !email || !ROLES.includes(role ?? "")) {
  console.error("Usage: set-admin.mjs <service-account.json> <email> <owner|manager|packer|none>");
  process.exit(1);
}

const sa = JSON.parse(readFileSync(file, "utf8"));
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
  iss: sa.client_email,
  scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore",
  aud: "https://oauth2.googleapis.com/token",
  iat: now,
  exp: now + 600,
})}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url")}`;

async function call(url, body, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
});
if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
const { access_token: token } = await tokenRes.json();

const project = sa.project_id;
const idt = `https://identitytoolkit.googleapis.com/v1/projects/${project}`;
const { users } = await call(`${idt}/accounts:lookup`, { email: [email] });
const uid = users?.[0]?.localId;
if (!uid) throw new Error(`No Firebase Auth user with email ${email}. Create it in the Firebase console first.`);

const claims = role === "none" ? {} : { admin: true, role };
await call(`${idt}/accounts:update`, { localId: uid, customAttributes: JSON.stringify(claims) });

const doc = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/admins/${uid}`;
if (role === "none") {
  await fetch(doc, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
} else {
  await call(doc, { fields: { uid: { stringValue: uid }, role: { stringValue: role } } }, "PATCH");
}
console.log(role === "none" ? `Removed dashboard access for ${email}.` : `${email} (${uid}) is now ${role}. Sign out and in again to apply.`);
