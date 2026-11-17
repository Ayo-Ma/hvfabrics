/* global process, console */
/**
 * Live smoke test: the deployed shop and dashboard still work under their security policies.
 * A too-strict Content-Security-Policy breaks a site silently (blocked scripts, fonts, sign-in),
 * so this browses the live sites and fails on any CSP violation or script error.
 * Read-only: it adds to a bag and opens checkout, but never submits a payment or signs in.
 *   node live-smoke.mjs
 */
import { chromium } from "@playwright/test";

const SHOP = process.env.SHOP_URL ?? "https://hv-storefront.harriesvogueglobal.workers.dev";
const DASH = process.env.DASH_URL ?? "https://hv-dashboard.harriesvogueglobal.workers.dev";

const browser = await chromium.launch(process.env.CI ? {} : { channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: 412, height: 900 } })).newPage();
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|404 \(Not Found\)/i.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => problems.push(`script error: ${e.message.slice(0, 200)}`));
page.on("response", (r) => {
  if (r.status() >= 500) problems.push(`server error ${r.status()}: ${r.request().method()} ${r.url().slice(0, 120)}`);
});
// CSP violations surface as console errors and as securitypolicyviolation events.
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP blocked ${e.violatedDirective}: ${e.blockedURI} (from ${e.sourceFile}:${e.lineNumber})`));
});

const step = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (e) {
    problems.push(`${name}: ${String(e).split("\n")[0]}`);
    console.log(`  FAIL  ${name}`);
  }
};

console.log("Shop");
await step("home page loads and becomes interactive", async () => {
  await page.goto(SHOP, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__hvHydrated === true, null, { timeout: 15000 });
});
await step("a product page loads with its photo", async () => {
  await page.getByRole("link", { name: /^Fabrics/ }).first().click();
  await page.waitForLoadState("networkidle");
  await page.locator('a[href^="/p/"]').first().click();
  await page.waitForLoadState("networkidle");
  const ok = await page.locator("main img").first().evaluate((img) => img.complete && img.naturalWidth > 0);
  if (!ok) throw new Error("product photo didn't load");
});
await step("add to bag works (scripts allowed)", async () => {
  await page.getByRole("button", { name: /add to bag/i }).click();
  await page.getByRole("button", { name: /added to bag/i }).waitFor({ timeout: 10000 });
});
await step("checkout page opens", async () => {
  await page.goto(`${SHOP}/checkout`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Pay/ }).waitFor();
});
await step("fonts load (Satoshi)", async () => {
  const loaded = await page.evaluate(async () => (await document.fonts.ready, [...document.fonts].some((f) => f.family.includes("Satoshi") && f.status === "loaded")));
  if (!loaded) throw new Error("Satoshi didn't load");
});

console.log("Dashboard");
await step("sign-in page loads and Firebase starts", async () => {
  await page.goto(DASH, { waitUntil: "networkidle" });
  await page.getByLabel("Email").waitFor({ timeout: 15000 });
});
await step("wrong password is refused with a clear message", async () => {
  await page.getByLabel("Email").fill("not-an-admin@example.com");
  await page.getByLabel("Password").fill("Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText(/don't match|Too many tries/).waitFor({ timeout: 15000 });
});

await browser.close();
const csp = problems.filter((p) => /CSP|Content Security Policy/i.test(p));
// Firebase logs the refused sign-in (HTTP 400) as a console error: expected here.
const real = problems.filter((p) => !/identitytoolkit|400 \(\)|status of 400/.test(p));
console.log(real.length ? `\nProblems:\n  ${real.join("\n  ")}` : "\nNo CSP violations or script errors.");
process.exit(real.length || csp.length ? 1 : 0);
