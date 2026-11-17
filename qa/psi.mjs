/* global process, console, fetch, URLSearchParams */
/**
 * Cross-check of the performance budget with PageSpeed Insights (Google's Lighthouse, run from
 * Google's servers on a standard mobile profile), independent of the local machine and connection.
 * The gate itself is lighthouse.mjs (calibrated to the machine). Google's anonymous quota is shared
 * and often used up: set PSI_KEY (a free API key from Google Cloud) for reliable runs.
 *   node psi.mjs [base-url]
 */
const BASE = process.argv[2] ?? "https://hv-storefront.harriesvogueglobal.workers.dev";
const PAGES = ["/", "/fabrics", "/p/damask"];
const BUDGET = { lcp: 2500, cls: 0.1, tbt: 200, homeJsKb: 200 };
let failed = false;

for (const path of PAGES) {
  const q = new URLSearchParams({ url: `${BASE}${path}`, strategy: "mobile", category: "performance" });
  if (process.env.PSI_KEY) q.set("key", process.env.PSI_KEY);
  let body;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
    body = await res.json();
    if (res.ok) break;
  }
  const lhr = body.lighthouseResult;
  if (!lhr) {
    console.log(`${path}: PageSpeed Insights error: ${body.error?.message ?? "unknown"}`);
    failed = true;
    continue;
  }
  const a = lhr.audits;
  const js = (a["network-requests"]?.details?.items ?? []).filter((i) => i.resourceType === "Script").reduce((n, i) => n + (i.transferSize ?? 0), 0) / 1024;
  const checks = [
    ["LCP", `${(a["largest-contentful-paint"].numericValue / 1000).toFixed(2)} s`, a["largest-contentful-paint"].numericValue < BUDGET.lcp],
    ["CLS", a["cumulative-layout-shift"].numericValue.toFixed(3), a["cumulative-layout-shift"].numericValue < BUDGET.cls],
    ["TBT (INP stand-in)", `${Math.round(a["total-blocking-time"].numericValue)} ms`, a["total-blocking-time"].numericValue < BUDGET.tbt],
    ...(path === "/" ? [["Home JS", `${js.toFixed(0)} KB`, js < BUDGET.homeJsKb]] : []),
  ];
  console.log(`\n${path}   performance ${Math.round(lhr.categories.performance.score * 100)} · server ${Math.round(a["server-response-time"]?.numericValue ?? 0)} ms`);
  for (const [name, value, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(20)} ${value}`);
    if (!ok) failed = true;
  }
  const field = body.loadingExperience?.metrics;
  if (field?.INTERACTION_TO_NEXT_PAINT) console.log(`  real visitors: INP ${field.INTERACTION_TO_NEXT_PAINT.percentile} ms`);
}
console.log(failed ? "\nPerformance budget: FAILED" : "\nPerformance budget: PASSED");
process.exit(failed ? 1 : 0);
