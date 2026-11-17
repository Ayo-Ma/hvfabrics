/* global process, console */
// Prints where the time goes on one page: LCP phases, server time, main-thread work by script, long tasks.
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.argv[2] ?? "https://hv-storefront.harriesvogueglobal.workers.dev/";
const chrome = await launch({ chromeFlags: ["--headless=new"] });
const { lhr } = await lighthouse(url, { port: chrome.port, onlyCategories: ["performance"] });
await chrome.kill();
const a = lhr.audits;
const show = (id) => {
  const x = a[id];
  if (!x) return;
  console.log(`\n## ${id}: ${x.displayValue ?? ""}`);
  const items = x.details?.items ?? [];
  for (const it of items.slice(0, 8)) {
    if (it.items) for (const sub of it.items.slice(0, 6)) console.log("   ", JSON.stringify(sub).slice(0, 220));
    else console.log("   ", JSON.stringify(it).slice(0, 220));
  }
};
console.log("LCP", a["largest-contentful-paint"].displayValue, "| FCP", a["first-contentful-paint"].displayValue, "| TBT", a["total-blocking-time"].displayValue, "| TTFB", a["server-response-time"]?.displayValue);
for (const id of Object.keys(a).filter((k) => /lcp|largest-contentful|bootup|mainthread|long-tasks|render-block|server-response|third-party|unused-javascript|legacy-javascript|document-latency|network-dependency|font/.test(k))) show(id);
