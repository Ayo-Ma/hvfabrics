/* global process, console, fetch, Buffer */
/**
 * Live security checks against the deployed shop, dashboard and API, done the way an outsider
 * would try them. No secrets needed: it only uses public addresses. Exits non-zero on any failure,
 * so CI can run it on a schedule and alert when something regresses.
 *
 *   node security-check.mjs
 *
 * What it checks:
 *  - browser protections (HSTS, no MIME sniffing, no framing / clickjacking, referrer policy, CSP)
 *  - the dashboard API refuses no token, forged tokens and dev tokens, and other websites (CORS)
 *  - Paystack webhooks with a forged signature are refused; checkout won't redirect to other sites
 *  - order lookup can't be used to discover orders; photo paths can't be abused
 *  - the database refuses anyone reading it directly from the internet (Firestore rules)
 */

const SHOP = process.env.SHOP_URL ?? "https://hv-storefront.harriesvogueglobal.workers.dev";
const DASH = process.env.DASH_URL ?? "https://hv-dashboard.harriesvogueglobal.workers.dev";
const API = process.env.API_URL ?? "https://hv-api.harriesvogueglobal.workers.dev";
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID ?? "harries-vogue";
const EVIL = "https://harriesvogue-login.example";

let failures = 0;
const results = [];
function check(area, name, ok, detail = "") {
  results.push({ area, name, ok, detail });
  if (!ok) failures++;
}
const get = (url, init) => fetch(url, { redirect: "manual", ...init });
const h = (res, name) => res.headers.get(name) ?? "";

/* ---------- Browser protections on every site ---------- */
for (const [label, url, framing] of [
  ["Shop", `${SHOP}/`, true],
  ["Dashboard", `${DASH}/`, true],
  ["API", `${API}/health`, false],
]) {
  const res = await get(url);
  check(label, "HTTPS enforced (HSTS)", /max-age=\d{7,}/.test(h(res, "strict-transport-security")), h(res, "strict-transport-security") || "missing");
  check(label, "No MIME sniffing", h(res, "x-content-type-options").toLowerCase() === "nosniff", h(res, "x-content-type-options") || "missing");
  check(label, "Referrer policy set", h(res, "referrer-policy") !== "", h(res, "referrer-policy") || "missing");
  if (framing) {
    const csp = h(res, "content-security-policy");
    const noFrame = /frame-ancestors\s+'none'/.test(csp) || h(res, "x-frame-options").toUpperCase() === "DENY";
    check(label, "Can't be framed by other sites (clickjacking)", noFrame, csp ? "CSP present" : h(res, "x-frame-options") || "missing");
    check(label, "Content-Security-Policy", csp !== "", csp ? `${csp.slice(0, 60)}…` : "missing");
  }
}

/* ---------- Dashboard API: who can get in ---------- */
{
  const noToken = await get(`${API}/admin/me`);
  check("Dashboard API", "Refuses requests with no sign-in", noToken.status === 401, `HTTP ${noToken.status}`);
  const dev = await get(`${API}/admin/orders`, { headers: { Authorization: "Bearer dev:owner" } });
  check("Dashboard API", "Refuses local-development tokens", dev.status === 401, `HTTP ${dev.status}`);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const forged = `${b64({ alg: "RS256", kid: "forged" })}.${b64({ aud: FIREBASE_PROJECT, iss: `https://securetoken.google.com/${FIREBASE_PROJECT}`, sub: "attacker", admin: true, role: "owner", exp: 9e9, iat: 1 })}.Zm9yZ2Vk`;
  const fake = await get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${forged}` } });
  check("Dashboard API", "Refuses forged sign-in tokens claiming owner", fake.status === 401, `HTTP ${fake.status}`);
  const none = `${b64({ alg: "none" })}.${b64({ aud: FIREBASE_PROJECT, sub: "x", admin: true, role: "owner", exp: 9e9, iat: 1 })}.`;
  const algNone = await get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${none}` } });
  check("Dashboard API", "Refuses unsigned ('alg: none') tokens", algNone.status === 401, `HTTP ${algNone.status}`);
  const upload = await get(`${API}/admin/images/0b9f2c4e-1d2a-4c3b-9e8f-7a6b5c4d3e2f/400.webp`, { method: "PUT", body: "x" });
  check("Dashboard API", "Refuses photo uploads without sign-in", upload.status === 401, `HTTP ${upload.status}`);
  const pre = await get(`${API}/admin/orders`, {
    method: "OPTIONS",
    headers: { Origin: EVIL, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
  });
  check("Dashboard API", "Other websites can't call it from a browser (CORS)", h(pre, "access-control-allow-origin") !== EVIL && h(pre, "access-control-allow-origin") !== "*", h(pre, "access-control-allow-origin") || "no CORS header");
  const ok = await get(`${API}/admin/orders`, {
    method: "OPTIONS",
    headers: { Origin: DASH, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
  });
  check("Dashboard API", "The real dashboard is allowed", h(ok, "access-control-allow-origin") === DASH, h(ok, "access-control-allow-origin"));
}

/* ---------- Payments ---------- */
{
  const body = JSON.stringify({ event: "charge.success", data: { reference: "attacker-ref", status: "success", amount: 1 } });
  const hook = await get(`${API}/paystack/webhook`, { method: "POST", headers: { "x-paystack-signature": "0".repeat(128), "Content-Type": "application/json" }, body });
  check("Payments", "Forged Paystack webhook refused", hook.status === 401, `HTTP ${hook.status}`);
  const noSig = await get(`${API}/paystack/webhook`, { method: "POST", body });
  check("Payments", "Webhook without signature refused", noSig.status === 401, `HTTP ${noSig.status}`);
  const redirect = await get(`${API}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ variantId: "x--v1", qty: 1 }],
      customer: { name: "Test", email: "t@example.com", phone: "08030000000" },
      delivery: { zoneId: "lagos", address: "1 Test Street", city: "Lagos", state: "Lagos" },
      callbackBase: `${EVIL}/order`,
    }),
  });
  check("Payments", "Checkout won't send shoppers back to another website", redirect.status === 400, `HTTP ${redirect.status}`);
}

/* ---------- Orders and photos ---------- */
{
  const a = await get(`${API}/orders/HV-ZZZZZZ?email=someone@example.com`);
  const b = await get(`${API}/orders/HV-ZZZZZZ?reference=guess`);
  check("Orders", "Order lookup gives nothing away (same answer for wrong and missing)", a.status === 404 && b.status === 404, `HTTP ${a.status}/${b.status}`);
  const pub = await (await get(`${API}/catalogue`)).text();
  check("Orders", "Public catalogue carries no customer data", !/@|phone|address|paystackRef/i.test(pub), "");
  for (const path of ["/images/products/..%2F..%2Fsettings/400.webp", "/images/products/x/../../admin/400.webp"]) {
    const r = await get(`${SHOP}${path}`);
    check("Photos", `Photo path abuse refused (${path.slice(17, 40)}…)`, r.status === 404 || r.status === 400, `HTTP ${r.status}`);
  }
}

/* ---------- The database itself ---------- */
{
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
  for (const doc of ["orders", "customers", "settings/store", "admins"]) {
    const r = await get(`${base}/${doc}`);
    check("Database", `Direct internet read of ${doc} refused`, r.status === 403 || r.status === 401, `HTTP ${r.status}`);
  }
  const w = await get(`${base}/settings/store?currentDocument.exists=true`, { method: "PATCH", body: JSON.stringify({ fields: {} }) });
  check("Database", "Direct internet write refused", w.status === 403 || w.status === 401, `HTTP ${w.status}`);
}

/* ---------- Report ---------- */
let area = "";
for (const r of results) {
  if (r.area !== area) console.log(`\n${(area = r.area)}`);
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
console.log(failures ? `\n${failures} security check(s) FAILED` : "\nAll security checks passed");
process.exit(failures ? 1 : 0);
