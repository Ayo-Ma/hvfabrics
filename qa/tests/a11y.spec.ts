import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * PLAN.md quality gate: axe, zero serious or critical issues, WCAG 2.2 AA.
 * Every storefront page and every dashboard screen, on a phone viewport, with content on them.
 */

const SHOP = "http://localhost:5173";
const DASH = "http://localhost:5180";
const API = "http://localhost:8787";

async function scan(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = bad.map((v) => `${v.impact} ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`).join("\n  ");
  expect(bad, `${label}\n  ${report}`).toEqual([]);
}

test.describe("storefront", () => {
  const pages: [string, string][] = [
    ["home", "/"],
    ["fabrics", "/fabrics"],
    ["lingerie", "/lingerie"],
    ["ready-to-wear", "/ready-to-wear"],
    ["search", "/search?q=fabric"],
    ["search, no results", "/search?q=zzzzqqq"],
    ["track order", "/track"],
    ["delivery policy", "/policies/delivery"],
    ["not found", "/no-such-page"],
  ];
  for (const [label, path] of pages) {
    test(label, async ({ page }) => {
      await page.goto(SHOP + path);
      await scan(page, label);
    });
  }

  test("product page, bag drawer and checkout", async ({ page }) => {
    const cat = (await (await fetch(`${API}/catalogue`)).json()) as { products: { slug: string; soldOut: boolean }[] };
    const product = cat.products.find((p) => !p.soldOut)!;
    await page.goto(`${SHOP}/p/${product.slug}`);
    await scan(page, "product page");
    await page.getByRole("button", { name: /add to bag/i }).click();
    await page.getByLabel(/^Bag, /).click();
    await expect(page.getByRole("link", { name: "Checkout" })).toBeVisible();
    await scan(page, "bag drawer");
    await page.goto(`${SHOP}/checkout`);
    await scan(page, "checkout");
    // Errors shown after an empty submit must be announced and labelled too.
    await page.getByRole("button", { name: /^Pay/ }).click();
    await scan(page, "checkout with errors");
  });
});

test.describe("dashboard", () => {
  test.beforeAll(async () => {
    await fetch(`${API}/admin/dev/sample-orders`, { method: "POST", headers: { Authorization: "Bearer dev:owner" } });
  });

  test("sign-in", async ({ page }) => {
    await page.goto(DASH);
    await scan(page, "sign-in");
  });

  const screens: [string, string][] = [
    ["today", "/"],
    ["orders board", "/orders"],
    ["products", "/products"],
    ["add product", "/products/new"],
    ["stock", "/stock?show=all"],
    ["settings", "/settings"],
  ];
  for (const [label, path] of screens) {
    test(label, async ({ page }) => {
      await page.goto(`${DASH}${path}${path.includes("?") ? "&" : "?"}devRole=owner`);
      await scan(page, label);
    });
  }

  test("order page and product editor", async ({ page }) => {
    await page.goto(`${DASH}/orders?devRole=owner`);
    await page.getByRole("link", { name: /HV-/ }).first().click();
    await expect(page.getByRole("button", { name: /Slip 80 mm/ })).toBeVisible();
    await scan(page, "order page");
    await page.goto(`${DASH}/products?devRole=owner`);
    await page.getByRole("link", { name: /sample/i }).first().click();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await scan(page, "product editor");
  });
});
