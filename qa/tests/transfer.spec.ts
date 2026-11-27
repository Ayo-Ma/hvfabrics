import { expect, test, type Page } from "@playwright/test";

/**
 * Bank transfer (run with playwright.transfer.config.ts: the API in transfer mode).
 * The account to pay into must never leave the customer's screen: not when a status check fails,
 * not when they come back from their bank app with a weak signal, not when a reload fails.
 */

const SHOP = "http://localhost:5173";

async function placeTransferOrder(page: Page): Promise<string> {
  await page.goto(`${SHOP}/fabrics`);
  await page.locator(".tile-card a").first().click();
  await page.getByRole("button", { name: /add to bag/i }).click();
  await page.getByLabel(/^Bag, [1-9]\d* items?$/).click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill("QA Transfer");
  await page.getByLabel("Email", { exact: true }).fill("qa.transfer@example.com");
  await page.getByLabel("Phone").fill("+234 803 123 4567");
  await page.locator('input[name="zoneId"][value="lagos"]').check({ force: true });
  await page.getByLabel("Street address").fill("12 Test Close");
  await page.getByLabel("Town or city").fill("Ikeja");
  await page.getByLabel("State").fill("Lagos");
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Your fabric is held for you" })).toBeVisible();
  return /\/order\/(HV-[A-Z0-9]{6})/.exec(page.url())![1]!;
}

const accountShown = (page: Page) => expect(page.getByText("0000000000")).toBeVisible();

test("the account details survive failed checks, a return from the bank app and a failed reload", async ({ page, context }) => {
  const number = await placeTransferOrder(page);
  await accountShown(page);
  await expect(page.getByText(number).first()).toBeVisible();

  // The customer goes to the bank app and comes back with no signal: checks fail, page stays.
  await context.setOffline(true);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(1500);
  await accountShown(page);
  await context.setOffline(false);

  // Checks fail and page data can't load: still the account, never an error page.
  await page.route("**/*.data*", (r) => r.abort());
  await page.route("**/status?reference=*", (r) => r.fulfill({ status: 500, body: "" }));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(1500);
  await expect(page.getByText(/Something snagged|That didn.t load|The connection dropped/)).toHaveCount(0);
  await accountShown(page);

  // She confirms the money: the next check turns the page, still without reloading its data.
  const reference = new URL(page.url()).searchParams.get("reference")!;
  const real = (await (await page.request.get(`${SHOP}/order/${number}/status?reference=${reference}`)).json()) as { order: Record<string, unknown> };
  await page.unroute("**/status?reference=*");
  await page.route("**/status?reference=*", (r) => r.fulfill({ json: { order: { ...real.order, status: "paid", payTo: undefined } } }));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await page.unroute("**/*.data*");
  await page.unroute("**/status?reference=*");

  // Track an order, by number and email, gives the account back too.
  await page.goto(`${SHOP}/track?number=${number}&email=qa.transfer@example.com`);
  await accountShown(page);
});
