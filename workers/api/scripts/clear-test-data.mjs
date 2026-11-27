#!/usr/bin/env node
/* global process, Buffer, fetch, URLSearchParams, console */
/**
 * Before launch: clear the test orders and test customers from Firestore, keeping the owner's
 * products and settings. Dry run by default: prints what's there (order numbers, statuses,
 * totals; product titles) and changes nothing. No customer names, emails or phones are printed.
 *
 *   node workers/api/scripts/clear-test-data.mjs <service-account.json>            # look only
 *   node workers/api/scripts/clear-test-data.mjs <service-account.json> --apply --backup=<file.json>
 *
 * The backup (required with --apply) holds every deleted document. Keep it outside the repo: it has
 * customers' details.
 *
 * --apply deletes every order and customer document and sets each variant's `reserved` back to 0
 * (holds belonged to the deleted test orders). Stock counts are left exactly as they are.
 */
import { createSign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [file, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");
const backup = flags.find((f) => f.startsWith("--backup="))?.slice("--backup=".length);
if (apply && !backup) {
  console.error("--apply needs --backup=<file.json> (outside the repo)");
  process.exit(1);
}
if (!file) {
  console.error("Usage: clear-test-data.mjs <service-account.json> [--apply]");
  process.exit(1);
}

const sa = JSON.parse(readFileSync(file, "utf8"));
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
  iss: sa.client_email,
  scope: "https://www.googleapis.com/auth/datastore",
  aud: "https://oauth2.googleapis.com/token",
  iat: now,
  exp: now + 900,
})}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url")}`;
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
});
if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
const { access_token: token } = await tokenRes.json();

const root = `projects/${sa.project_id}/databases/(default)/documents`;
const base = `https://firestore.googleapis.com/v1/${root}`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function query(structuredQuery) {
  const res = await fetch(`${base}:runQuery`, { method: "POST", headers, body: JSON.stringify({ structuredQuery }) });
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).flatMap((r) => (r.document ? [r.document] : []));
}
const all = (collectionId, allDescendants = false) => query({ from: [{ collectionId, allDescendants }] });

const val = (v) => {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, val(x)]));
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(val);
  return undefined;
};
const naira = (m) => (m && typeof m.amount === "number" ? `₦${(m.amount / 100).toLocaleString("en-NG")}` : "?");

const [orders, customers, products, variants] = await Promise.all([all("orders"), all("customers"), all("products"), all("variants", true)]);

console.log(`\nOrders: ${orders.length}`);
for (const d of orders) {
  const f = d.fields ?? {};
  console.log(`  ${val(f.number)}  ${String(val(f.status)).padEnd(9)} ${String(val(f.payment) ?? "card").padEnd(8)} ${naira(val(f.totals)?.total).padStart(12)}  ${val(f.createdAt)}`);
}
console.log(`\nCustomers: ${customers.length}`);
console.log(`\nProducts: ${products.length} (kept)`);
for (const d of products) {
  const f = d.fields ?? {};
  console.log(`  ${String(val(f.status)).padEnd(8)} ${val(f.line)?.padEnd(6) ?? ""} ${val(f.title)}  [${d.name.split("/").pop()}]`);
}
const held = variants.filter((d) => (val(d.fields?.reserved) ?? 0) > 0);
console.log(`\nVariants: ${variants.length}, with stock held for orders: ${held.length}`);

if (!apply) {
  console.log("\nDry run: nothing changed. Add --apply to delete the orders and customers above.");
  process.exit(0);
}

writeFileSync(backup, JSON.stringify({ at: new Date().toISOString(), orders, customers, held }, null, 1));
console.log(`
Backup written: ${backup}`);

// Firestore commits take up to 500 writes.
const writes = [
  ...orders.map((d) => ({ delete: d.name })),
  ...customers.map((d) => ({ delete: d.name })),
  ...held.map((d) => ({
    update: { name: d.name, fields: { reserved: { integerValue: "0" } } },
    updateMask: { fieldPaths: ["reserved"] },
  })),
];
for (let i = 0; i < writes.length; i += 400) {
  const res = await fetch(`${base}:commit`, { method: "POST", headers, body: JSON.stringify({ writes: writes.slice(i, i + 400) }) });
  if (!res.ok) throw new Error(`Commit failed: ${res.status} ${await res.text()}`);
}
console.log(`\nDeleted ${orders.length} orders and ${customers.length} customers; released holds on ${held.length} variants.`);
