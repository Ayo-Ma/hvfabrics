# Harries Vogue — Implementation Plan

How we build `docs/PLAN.md`, step by step. PLAN.md is the spec; this file is the order of work and its status. Update the status column as steps finish.

Status: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked (needs input)

## Phase 0 — Foundation

| # | Step | Output | Status |
| --- | --- | --- | --- |
| 0.1 | Repo: git, pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier | root config | ✅ |
| 0.2 | Assets: organise uploads into the PLAN.md layout, optimise SVGs, generate `ASSETS_TODO.md` | `assets/` | ✅ |
| 0.3 | Design tokens as CSS variables + Tailwind v4 theme | `packages/ui/src/tokens.css` | ✅ |
| 0.4 | Fonts: Satoshi (400, 500, 700, 900), subsetted woff2, self-hosted | `assets/fonts/` | ✅ |
| 0.5 | Icon components generated from `assets/icons/` | `packages/ui/src/icons/` | ✅ |
| 0.6 | Core types + zod schemas for every collection in the data model | `packages/core/src/schemas/` | ✅ |
| 0.7 | Money utils (integer minor units + currency), fully unit-tested | `packages/core/src/money.ts` | ✅ |
| 0.8 | Seed catalogue for local dev (placeholder products, clearly marked `[TBC]`) | `packages/core/src/seed/` | ✅ |
| 0.9 | Firebase project, Firestore rules, service account | Firebase console | ✅ — project, rules + indexes deployed, service account in Worker secrets |
| 0.10 | Cloudflare account: Workers, R2 bucket, domain | Cloudflare dashboard | ✅ — Workers on harriesvogueglobal.workers.dev, KV, R2 `hv-images`; custom domain later |
| 0.11 | Paystack test-mode keys | Paystack dashboard | ✅ — test keys in Worker secrets |
| 0.12 | CI: GitHub Actions running types, lint, unit tests | `.github/workflows/ci.yml` | 🟡 — written (types, lint, unit, Playwright + axe; manual Lighthouse job); runs once the repo is pushed to GitHub |
| 0.13 | Figma components and high-fidelity homepage and product-page mockups | Figma | ⬜ (Malik) |

## Phase 1 — MVP: she can sell

### Worker API (`workers/api`)

| # | Step | Status |
| --- | --- | --- |
| 1.1 | Worker skeleton (Hono router), zod-validated inputs, rate limiting on checkout and search | ✅ — Hono, zod on every input, Workers rate limiting on checkout/search/events |
| 1.2 | Firestore REST client with a service-account token (JWT signed in the Worker, cached) | ✅ — live reads and transactional writes against the real project (2026-11-13) |
| 1.3 | Catalogue build on publish → cached JSON at the edge; local dev serves the seed catalogue | ✅ — built from the store, kept in KV, rebuilt after every stock change |
| 1.4 | Search index build + browser search with typo tolerance and synonyms | 🟡 — index + typo/synonym search in core; server-side search page live; in-browser index next |
| 1.5 | Checkout: validate bag against live stock, reserve for 15 minutes, create `pending` order | ✅ — atomic; 20 concurrent buyers for 5 units → exactly 5 succeed (test) |
| 1.6 | Paystack initialise transaction (amount in kobo, order id as reference) | ✅ — live test checkout returned a Paystack payment page (HV-H99VBZ) |
| 1.7 | Paystack webhook: HMAC SHA-512 signature check, re-verify, one Firestore transaction, idempotent | 🟡 — signature + re-verify + amount check + idempotent, all tested; needs keys to run live |
| 1.8 | Cron every 5 minutes: release expired reservations, cancel stale unpaid orders | ✅ — cron */5; also honours late payments and flags stock shortfalls |
| 1.9 | Confirmation email (Resend) + push and email alert to her | 🟡 — email and FCM push both wired and tested with mocks; live once Resend and Firebase keys exist |
| 1.10 | Analytics events to Workers Analytics Engine | ✅ — POST /events → Workers Analytics Engine with Cloudflare country/city |

### Storefront (`apps/storefront`)

| # | Step | Status |
| --- | --- | --- |
| 1.11 | React Router v7 framework mode on Cloudflare Workers, SSR, tokens and fonts wired | ✅ |
| 1.12 | Layout: header (horizontal lockup, search, bag), footer, skip link, focus styles | ✅ |
| 1.13 | Home: hero per line, category tiles, new-in | 🟡 — built; waiting for campaign photos |
| 1.14 | Category pages: Fabrics, Lingerie, Ready-to-Wear, with filters and sort | ✅ |
| 1.15 | Product page: gallery, yard or size picker, live stock, sold-out state, add to bag | ✅ — tape-measure yard picker; stock re-checked on focus and every 60 s |
| 1.16 | Bag drawer (add-to-bag motion to bag icon), persisted bag | ✅ |
| 1.17 | One-page guest checkout → Paystack → confirmation page | 🟡 — storefront ↔ API wired and tested locally; needs Paystack keys for a real payment |
| 1.18 | Order tracking page (order number + email) | 🟡 — live; check with a real test order |
| 1.19 | Empty, error, 404 and offline states using the illustrations | ✅ |
| 1.20 | SEO: meta, Open Graph, product structured data, sitemap | 🟡 — meta + Product JSON-LD done; sitemap and OG image pending |

### Dashboard (`apps/dashboard`)

| # | Step | Status |
| --- | --- | --- |
| 1.21 | Vite + React PWA, installable, Firebase Auth login with admin claim | 🟡 — PWA, manifest, service worker, Firebase sign-in and Worker-side ID-token check (admin claim + role) built and tested; dev roles until the Firebase project exists |
| 1.22 | Today screen: money in today, this week, this month | ✅ — computed in her time zone; plus orders to pack, cutting list, running low |
| 1.23 | Products: add or edit from her phone, photos resized in the browser (400/800/1200/2000, AVIF + WebP) to R2 | 🟡 — R2 live and serving; confirm one upload from the live dashboard |
| 1.24 | Stock levels and low-stock flags | ✅ — stock screen saves per row; can't go below stock held by shoppers paying |
| 1.25 | Orders board: New → Packed → Sent | ✅ — with undo, search, live refresh every 30 s |
| 1.26 | One-tap print: A4 invoice and 80 mm thermal slip | 🟡 — both render correctly to PDF; needs a test on her actual thermal printer |
| 1.27 | Push notification per paid order | 🟡 — FCM HTTP v1 send, token registration, test alert; needs Firebase project + Web Push key to verify the 10-second target |

### Phase 1 quality gate

| # | Check | Status |
| --- | --- | --- |
| 1.28 | Playwright end-to-end: browse → bag → checkout → paid (Paystack test) → order in dashboard | ✅ — passes (qa/tests/checkout.spec.ts). Paystack's hosted page is behind a bot check, so the pay step uses a local stand-in that signs the webhook like Paystack; real test mode verified live up to Paystack's page, and by her phone test |
| 1.29 | axe accessibility: zero serious or critical | ✅ — 18 shop and dashboard screens, WCAG 2.2 AA, zero serious/critical (fixed: product gallery not keyboard-scrollable) |
| 1.30 | Lighthouse mobile, throttled 4G: LCP < 2.5 s, CLS < 0.1, INP < 200 ms, home JS < 200 KB | ✅ — live site: LCP 2.16 / 2.15 / 2.31 s, CLS 0, TBT 0 ms, home JS 169 KB (qa/lighthouse.mjs, CPU slowdown calibrated per Lighthouse docs). INP confirmed from real visitors after launch |
| 1.31 | 20 concurrent purchases of the last units leave stock correct | ✅ — against the real Firestore: 5 sold, 15 told sold out, 0 errors, nothing oversold (firestore.live.test.ts, cleans up after itself) |
| 1.32 | Every acceptance check in PLAN.md "Phase 1 is done when" passes | 🟡 — automated checks pass; waiting on her phone test (push within 10 s, print on her thermal printer, add a product with photos in under 2 minutes) |

Phases 2–5 follow PLAN.md and get their own tables when Phase 1 passes.

## Order of work

1. Phase 0 code steps (0.1–0.8, 0.12) — nothing external needed.
2. Storefront against the seed catalogue (1.11–1.16, 1.19) — still nothing external needed.
3. Worker checkout and Paystack (1.1–1.8) — needs Paystack test keys and Firebase.
4. Dashboard (1.21–1.27) — needs Firebase and R2.
5. Quality gate, then launch in Nigeria.

## Decisions made during implementation

Small choices PLAN.md doesn't cover. Anything bigger goes to Malik first.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-12 | React Router pinned to 7.x (7.18.5) although v8 exists | PLAN.md specifies v7 |
| 2026-11-12 | Hono as the Worker router | Tiny, built for Workers, typed routes |
| 2026-11-12 | zod 4, Vitest 3, Vite 7, TypeScript 5.9 | Latest versions compatible with React Router 7 |
| 2026-11-12 | Illustrations shipped as optimised PNG/WebP for now | The uploaded files are raster images; replace with SVGs when available |
| 2026-11-12 | Harries Yellow = `#FDCE02` | Sampled from the logo files |
| 2026-11-13 | Poppins dropped; Satoshi (400/500/700/900) for everything | Client decision |
| 2026-11-13 | ₦ glyph from a Plus Jakarta Sans subset via `unicode-range` | Satoshi has no ₦ |
| 2026-11-13 | Variant unit `piece` added beside yard/bundle | Lingerie and ready-to-wear sell by the item — **Malik to confirm** |
| 2026-11-13 | Storefront home: "dark room" composition (design-taste-frontend draw, seed 347725934), palette and type kept from the brand | Black brand base; few strong pictures needed while photos are pending |
| 2026-11-13 | Built catalogue + search index stored in Workers KV | Shoppers never read Firestore (PLAN.md trap 2); KV is free at this volume |
| 2026-11-13 | Variant ids `<productId>--<key>` | Lets the Worker find products/{id}/variants/{variantId} from a bag line |
| 2026-11-13 | Payment arriving after the 15-minute hold expired: take the stock if it's still there; otherwise mark paid and flag `paid_after_expiry_stock_short` for her to contact the customer | **Malik to confirm** — the alternative is an automatic refund |
| 2026-11-13 | Local dev without Firebase uses an in-memory store seeded with placeholders; production refuses it | Build and test before accounts exist |
| 2026-11-13 | Checkout callback: API appends `/<order number>`, Paystack appends `?reference=` | Confirmation page can verify by reference |
| 2026-11-13 | Dashboard reads and writes through the API Worker, never Firestore from the browser | One code path for stock rules; works with the dev store; Firestore rules stay closed |
| 2026-11-13 | Roles: packer = orders + printing; owner and manager = everything else (products, stock, money in) | **Malik to confirm** |
| 2026-11-13 | Orders board allows one step back (Packed → New, Sent → Packed) for mis-taps; no cancel of paid orders | A paid cancel needs a refund policy — **Malik to confirm** |
| 2026-11-13 | Order timestamps `packedAt`, `shippedAt`, `deliveredAt` and item `unit` added to the order schema | Board times and the cutting list ("8 yards") |
| 2026-11-13 | Weeks start on Monday for "this week" | Nigerian business convention |
| 2026-11-13 | Dashboard design: "achromatic ledger" app style (design-taste-frontend, seed 2114315845), icon rail / phone bottom bar; yellow only on today's money and the one primary button | App-screen rules + brand rule (yellow primary buttons) |
| 2026-11-13 | Push is data-only FCM drawn by our own service worker | Same look on every browser; tap opens the order |
| 2026-11-13 | Photos encoded with the browser's own encoder when it has one, else @jsquash (WASM, lazy) | AVIF encoding isn't built into most browsers |
| 2026-11-13 | Dashboard dev port 5180 (5174 was taken by another local project) | — |
| 2026-11-17 | End-to-end pay step uses a local Paystack stand-in (qa/fake-paystack.mjs) | Paystack's hosted checkout is behind a bot check; automating around it isn't appropriate. The stand-in signs webhooks exactly as Paystack does |
| 2026-11-17 | Lighthouse CPU slowdown calibrated to the machine's benchmark index (Lighthouse docs) | A fixed 4x on a slow laptop simulates a far slower phone than PLAN.md's mid-range Android |
| 2026-11-17 | First screen of the home page has no entrance animation | The hidden headline was the LCP and waited for script (~0.6 s) |
| 2026-11-17 | Product photos served from the shop's own address (edge-cached proxy over the service binding) | A second origin cost phones on 4G a new connection before the LCP image |

## Blocked: needed from Malik and her

1. Firebase project (with owner access for the build), Cloudflare account, Paystack account in test mode.
2. Delivery: Lagos plus nationwide flat rates? Zone names and fees.
3. Real products for launch: titles, prices, stock, photos (per PLAN.md photo spec).
4. Policies: delivery, returns, privacy (placeholders `[TBC]` until then).
5. Campaign photography for hero and category tiles.
