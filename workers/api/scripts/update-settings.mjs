#!/usr/bin/env node
/* global process, Buffer, fetch, URLSearchParams, console */
/**
 * Writes the shop's real delivery zones, address, policies and order-alert emails to settings/store,
 * from workers/api/scripts/shop-settings.json (the owner's questionnaire answers).
 * Only those fields change: the phones registered for order alerts are kept.
 *
 *   node workers/api/scripts/update-settings.mjs <service-account.json> [--dry-run] [--bank <bank.json>]
 *
 * --bank sets the account customers pay into by transfer, from a private file kept OUTSIDE the repo
 * (the hv-secrets folder): {"bank": "Opay", "accountName": "...", "accountNumber": "0123456789"}.
 *
 * The shop picks up the change within a minute (catalogue cache). Validated against the same
 * rules as the API before anything is sent.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("Usage: update-settings.mjs <service-account.json> [--dry-run] [--bank <bank.json>]");
  process.exit(1);
}
const dry = args.includes("--dry-run");
const bankFile = args.includes("--bank") ? args[args.indexOf("--bank") + 1] : null;
if (args.includes("--bank") && !bankFile) throw new Error("--bank needs a file");
const bank = bankFile ? JSON.parse(readFileSync(bankFile, "utf8")) : null;
if (bank) {
  // Same rules as BankTransferSchema in @hv/core.
  if (typeof bank.bank !== "string" || bank.bank.trim().length < 2) throw new Error("bank: the bank's name, e.g. Opay");
  if (typeof bank.accountName !== "string" || bank.accountName.trim().length < 2) throw new Error("accountName missing");
  if (!/^[0-9]{10}$/.test(bank.accountNumber ?? "")) throw new Error("accountNumber must be the 10-digit account number");
}
const want = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "shop-settings.json"), "utf8"));

// Same shape the API's SettingsSchema accepts: integer kobo, unique zone ids, real emails.
const ids = new Set();
for (const z of want.deliveryZones) {
  if (!z.id || ids.has(z.id)) throw new Error(`Zone id missing or repeated: ${z.id}`);
  ids.add(z.id);
  if (!Number.isInteger(z.fee.amount) || z.fee.amount < 0 || z.fee.currency !== "NGN") throw new Error(`Bad fee for ${z.id}`);
  if (!z.name || typeof z.eta !== "string") throw new Error(`Bad name or eta for ${z.id}`);
}
for (const e of want.notificationEmails) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error(`Bad email ${e}`);
for (const k of ["delivery", "returns", "privacy"]) if (!want.policies[k]) throw new Error(`Missing ${k} policy`);

const str = (v) => ({ stringValue: v });
const zone = (z) => ({
  mapValue: {
    fields: {
      id: str(z.id),
      name: str(z.name),
      fee: { mapValue: { fields: { amount: { integerValue: String(z.fee.amount) }, currency: str(z.fee.currency) } } },
      eta: str(z.eta),
    },
  },
});
const fields = {
  deliveryZones: { arrayValue: { values: want.deliveryZones.map(zone) } },
  storeAddress: str(want.storeAddress),
  policies: { mapValue: { fields: Object.fromEntries(["delivery", "returns", "privacy"].map((k) => [k, str(want.policies[k])])) } },
  notificationTargets: { mapValue: { fields: { emails: { arrayValue: { values: want.notificationEmails.map(str) } } } } },
};
const mask = ["deliveryZones", "storeAddress", "policies", "notificationTargets.emails"];
if (bank) {
  fields.bankTransfer = {
    mapValue: { fields: { bank: str(bank.bank.trim()), accountName: str(bank.accountName.trim()), accountNumber: str(bank.accountNumber) } },
  };
  mask.push("bankTransfer");
}

if (dry) {
  console.log(`Dry run. Would set ${mask.join(", ")}:`);
  for (const z of want.deliveryZones) console.log(`  ${z.name.padEnd(32)} ₦${(z.fee.amount / 100).toLocaleString("en-NG")}  ${z.eta}`);
  if (bank) console.log(`  Pay into: ${bank.bank}, ${bank.accountName}, ******${bank.accountNumber.slice(-4)}`);
  process.exit(0);
}

const sa = JSON.parse(readFileSync(file, "utf8"));
const now = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
  iss: sa.client_email,
  scope: "https://www.googleapis.com/auth/datastore",
  aud: "https://oauth2.googleapis.com/token",
  iat: now,
  exp: now + 600,
})}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url")}`;
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
});
if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
const { access_token: token } = await tokenRes.json();

const qs = mask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join("&");
const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/settings/store?currentDocument.exists=true&${qs}`;
const res = await fetch(url, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
});
if (!res.ok) throw new Error(`Couldn't update settings/store: ${res.status} ${(await res.text()).slice(0, 300)}`);
console.log(`Updated settings/store in ${sa.project_id}: ${want.deliveryZones.length} delivery options, address, policies, alert email${bank ? ", transfer account" : ""}.`);
