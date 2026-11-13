#!/usr/bin/env node
/* global process, Buffer, fetch, URLSearchParams, console */
/**
 * One-time setup of a new Firestore database: creates settings/store, which the API needs
 * before it can serve the shop. Never overwrites an existing settings document.
 *
 *   node workers/api/scripts/init-firestore.mjs <service-account.json> <owner-alert-email>
 *
 * Delivery zones, fees and policies start as visible [TBC] placeholders (CLAUDE.md: never invent
 * prices or policies). Replace them with the real ones from Harries Vogue in the Firebase console
 * (Firestore → settings → store) before launch.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const [file, ownerEmail] = process.argv.slice(2);
if (!file || !ownerEmail || !ownerEmail.includes("@")) {
  console.error("Usage: init-firestore.mjs <service-account.json> <owner-alert-email>");
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
  exp: now + 600,
})}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url")}`;
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
});
if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
const { access_token: token } = await tokenRes.json();

const str = (v) => ({ stringValue: v });
const ngn = (amount) => ({ mapValue: { fields: { amount: { integerValue: String(amount) }, currency: str("NGN") } } });
const zone = (id, name) => ({ mapValue: { fields: { id: str(id), name: str(name), fee: ngn(0), eta: str("[TBC]") } } });

const fields = {
  deliveryZones: { arrayValue: { values: [zone("lagos", "[TBC] Lagos"), zone("nationwide", "[TBC] Rest of Nigeria")] } },
  storeAddress: str("[TBC: shop address]"),
  policies: {
    mapValue: { fields: { delivery: str("[TBC: delivery policy]"), returns: str("[TBC: returns policy]"), privacy: str("[TBC: privacy policy]") } },
  },
  notificationTargets: {
    mapValue: { fields: { emails: { arrayValue: { values: [str(ownerEmail)] } }, pushTokens: { arrayValue: {} } } },
  },
};

const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/settings/store?currentDocument.exists=false`;
const res = await fetch(url, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
});
const text = res.ok ? "" : await res.text();
if (res.status === 409 || res.status === 412 || /ALREADY_EXISTS|FAILED_PRECONDITION/.test(text)) {
  console.log("settings/store already exists — left unchanged.");
} else if (!res.ok) {
  throw new Error(`Couldn't create settings/store: ${res.status} ${text}`);
} else {
  console.log(`Created settings/store in ${sa.project_id}. Order alert emails go to ${ownerEmail}.`);
  console.log("Replace the [TBC] delivery zones, fees and policies in the Firebase console before launch.");
}
