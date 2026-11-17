/* global process, console */
/**
 * PLAN.md quality gate: Lighthouse, mobile, throttled 4G.
 *   LCP < 2.5 s · CLS < 0.1 · INP < 200 ms · home page JS < 200 KB
 * Lab runs can't measure INP (it needs real taps), so Total Blocking Time stands in for it,
 * as Lighthouse itself recommends; INP is then confirmed from real visitors after launch.
 *
 *   node lighthouse.mjs [base-url]      (default: the live storefront)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const BASE = process.argv[2] ?? "https://hv-storefront.harriesvogueglobal.workers.dev";
const PAGES = ["/", "/fabrics", "/p/damask"];
const BUDGET = { lcp: 2500, cls: 0.1, tbt: 200, homeJsKb: 200 };
const RUNS = 3; // median of 3: one run is too noisy to pass or fail on

mkdirSync("lighthouse-report", { recursive: true });
const chrome = await launch({ chromeFlags: ["--headless=new"] });
let failed = false;

// CPU slowdown calibrated to this machine (Lighthouse docs, "CPU throttling": 4x is meant for
// high-tier desktops with a benchmark index of 1500+, 2x for 1000-1500, 1x below 1000).
// A fixed 4x on a slower laptop simulates a phone far slower than PLAN.md's mid-range Android.
const probe = await lighthouse("https://example.com/", { port: chrome.port, onlyAudits: ["viewport"] });
const bench = probe.lhr.environment.benchmarkIndex;
const cpu = Number(process.env.LH_CPU) || (bench >= 1500 ? 4 : bench >= 1000 ? 2 : 1);
console.log(`machine benchmark index ${bench} → CPU slowdown ${cpu}x · network: simulated 4G (150 ms RTT, 1.6 Mbps)`);
const settings = { throttling: { cpuSlowdownMultiplier: cpu } };

for (const path of PAGES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await lighthouse(
      `${BASE}${path}`,
      { port: chrome.port, output: "html", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] },
      { extends: "lighthouse:default", settings },
    );
    runs.push(r);
  }
  const metric = (r, id) => r.lhr.audits[id].numericValue;
  runs.sort((a, b) => metric(a, "largest-contentful-paint") - metric(b, "largest-contentful-paint"));
  const mid = runs[Math.floor(RUNS / 2)];
  const lhr = mid.lhr;
  const js = lhr.audits["network-requests"].details.items
    .filter((it) => it.resourceType === "Script")
    .reduce((n, it) => n + (it.transferSize ?? 0), 0);
  const row = {
    lcp: metric(mid, "largest-contentful-paint"),
    cls: metric(mid, "cumulative-layout-shift"),
    tbt: metric(mid, "total-blocking-time"),
    jsKb: js / 1024,
  };
  const checks = [
    ["LCP", `${(row.lcp / 1000).toFixed(2)} s`, row.lcp < BUDGET.lcp],
    ["CLS", row.cls.toFixed(3), row.cls < BUDGET.cls],
    ["TBT (INP stand-in)", `${Math.round(row.tbt)} ms`, row.tbt < BUDGET.tbt],
    ...(path === "/" ? [["Home JS", `${row.jsKb.toFixed(0)} KB`, row.jsKb < BUDGET.homeJsKb]] : []),
  ];
  const scores = Object.entries(lhr.categories).map(([k, c]) => `${k} ${Math.round(c.score * 100)}`).join(" · ");
  console.log(`\n${path}   (${scores})`);
  for (const [name, value, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(20)} ${value}`);
    if (!ok) failed = true;
  }
  if (row.lcp >= BUDGET.lcp) console.log(`        LCP element: ${lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? "?"}`);
  writeFileSync(`lighthouse-report/${path === "/" ? "home" : path.replace(/\//g, "_").slice(1)}.html`, mid.report);
}

await chrome.kill();
console.log(failed ? "\nPerformance budget: FAILED" : "\nPerformance budget: PASSED");
process.exit(failed ? 1 : 0);
