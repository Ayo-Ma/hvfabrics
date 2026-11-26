import { expect, test } from "@playwright/test";

/**
 * PLAN.md Phase 1 acceptance, automated:
 *  - a customer finds a fabric, takes the 2 yards it starts at, pays and sees a confirmation, without help;
 *  - the paid order appears in her dashboard and moves New → Packed;
 *  - stock goes down by exactly what was bought;
 *  - a sold-out variant shows "Sold out" and can't be bought.
 */

const SHOP = "http://localhost:5173";
const DASH = "http://localhost:5180";
const API = "http://localhost:8787";

interface CatVariant {
  id: string;
  available: number;
}
interface CatProduct {
  slug: string;
  title: string;
  line: string;
  soldOut: boolean;
  variants: CatVariant[];
}

/** The real count is staff-only: the public catalogue never carries it. */
async function realStock(variantId: string): Promise<number> {
  const res = await fetch(`${API}/admin/products`, { headers: { Authorization: "Bearer dev:owner" } });
  const { entries } = (await res.json()) as { entries: { variants: { id: string; stock: number; reserved: number }[] }[] };
  const v = entries.flatMap((e) => e.variants).find((x) => x.id === variantId)!;
  return v.stock - v.reserved;
}

async function catalogue(): Promise<CatProduct[]> {
  const res = await fetch(`${API}/catalogue`);
  return ((await res.json()) as { products: CatProduct[] }).products;
}

test("browse → 2 yards → pay → confirmation → order in the dashboard → stock down", async ({ page }) => {
  const before = await catalogue();
  const counts = await Promise.all(before.map((p) => (p.line === "fabric" && !p.soldOut ? realStock(p.variants[0]!.id) : Promise.resolve(0))));
  const fabric = before.find((_, i) => counts[i]! >= 10)!;
  expect(fabric, "a fabric with stock in the sample catalogue").toBeTruthy();
  const variantBefore = await realStock(fabric.variants[0]!.id);

  // Find it the way a shopper would: the Fabrics page.
  await page.goto(SHOP);
  await page.getByRole("link", { name: /^Shop Fabrics$/ }).first().click();
  await expect(page).toHaveURL(/\/fabrics/);
  await page.getByRole("link", { name: fabric.title }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(fabric.title);

  // Cloth starts at 2 yards (the owner's minimum), so that is the tape's default. Adding flies the item to the bag icon; the shopper then opens the bag.
  await expect(page.getByLabel(/yards?/i).first()).toHaveValue("2");
  await page.waitForLoadState("networkidle"); // tap after the page is interactive, as a person would
  await page.getByRole("button", { name: /add to bag/i }).click();
  await expect(page.getByRole("button", { name: /added to bag/i })).toBeVisible();
  await page.getByLabel(/^Bag, [1-9]\d* items?$/).click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

  await page.getByLabel("Full name").fill("QA Shopper");
  await page.getByLabel("Email", { exact: true }).fill("qa.shopper@example.com");
  await page.getByLabel("Phone").fill("0803 123 4567");
  await page.locator('input[name="zoneId"][value="lagos"]').check({ force: true });
  await page.getByLabel("Street address").fill("12 Test Close");
  await page.getByLabel("Town or city").fill("Ikeja");
  await page.getByLabel("State").fill("Lagos");
  await page.getByRole("button", { name: /^Pay/ }).click();

  // Paystack's part (the local stand-in), then back to the shop.
  await page.getByRole("button", { name: "Pay (test)" }).click();
  await expect(page).toHaveURL(/\/order\/HV-[A-Z0-9]{6}/);
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  const number = /\/order\/(HV-[A-Z0-9]{6})/.exec(page.url())![1]!;

  // Stock: exactly 2 fewer, sold (not just held).
  await expect.poll(() => realStock(fabric.variants[0]!.id)).toBe(variantBefore - 2);

  // Her dashboard: the order is in New, and one tap packs it.
  await page.goto(`${DASH}/orders?devRole=packer`);
  const card = page.getByRole("listitem").filter({ hasText: number });
  await expect(card).toBeVisible();
  await expect(card).toContainText("2 yards");
  await card.getByRole("button", { name: "Mark packed" }).click();
  await expect(page.getByText(`${number} moved to Packed`)).toBeVisible();
});

test("a sold-out variant shows Sold out and can't be bought", async ({ page }) => {
  const soldOut = (await catalogue()).find((p) => p.soldOut)!;
  expect(soldOut, "a sold-out product in the sample catalogue").toBeTruthy();
  await page.goto(`${SHOP}/p/${soldOut.slug}`);
  const button = page.getByRole("button", { name: "Sold out" });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
});
