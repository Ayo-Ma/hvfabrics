import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 1 quality gate (PLAN.md): end-to-end and accessibility, on a mid-range Android phone.
 * Starts its own stack: the API on the in-memory store (env "e2e"), the storefront, the dashboard
 * in dev-role mode, and a local Paystack stand-in (see fake-paystack.mjs for why).
 * Nothing here touches the real Firebase project or real Paystack.
 * Stop your own dev servers first: the ports are the same.
 */
const root = "..";

export default defineConfig({
  testDir: "./tests",
  // Transfer mode has its own stack: playwright.transfer.config.ts.
  testIgnore: /transfer\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    ...devices["Pixel 7"],
    // The system Chrome, so no browser download is needed locally; CI installs Chromium.
    ...(process.env.CI ? {} : { channel: "chrome" }),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node fake-paystack.mjs",
      port: 8799,
      reuseExistingServer: false,
    },
    {
      command: "corepack pnpm exec wrangler dev --env e2e --port 8787",
      cwd: `${root}/workers/api`,
      url: "http://localhost:8787/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "corepack pnpm exec react-router dev --port 5173 --strictPort",
      cwd: `${root}/apps/storefront`,
      url: "http://localhost:5173/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "corepack pnpm exec vite --mode e2e --port 5180 --strictPort",
      cwd: `${root}/apps/dashboard`,
      url: "http://localhost:5180/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
