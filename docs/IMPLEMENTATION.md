# Harries Vogue — Implementation Plan

How we build `docs/PLAN.md`, step by step. PLAN.md is the spec; this file is the order of work and its status. Update the status column as steps finish.

Status: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked (needs input)

## Phase 0 — Foundation

| # | Step | Output | Status |
| --- | --- | --- | --- |
| 0.1 | Repo: git, pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier | root config | 🟡 |
| 0.2 | Assets: organise uploads into the PLAN.md layout, optimise SVGs, generate `ASSETS_TODO.md` | `assets/` | 🟡 |
| 0.3 | Design tokens as CSS variables + Tailwind v4 theme | `packages/ui/src/tokens.css` | ⬜ |
| 0.4 | Fonts: Satoshi (700, 900) and Poppins (400, 500, 600), subsetted woff2, self-hosted | `assets/fonts/` | ⬜ |
| 0.5 | Icon components generated from `assets/icons/` | `packages/ui/src/icons/` | ⬜ |
| 0.6 | Core types + zod schemas for every collection in the data model | `packages/core/src/schemas/` | ⬜ |
| 0.7 | Money utils (integer minor units + currency), fully unit-tested | `packages/core/src/money.ts` | ⬜ |
| 0.8 | Seed catalogue for local dev (placeholder products, clearly marked `[TBC]`) | `packages/core/src/seed/` | ⬜ |
| 0.9 | Firebase project, Firestore rules, service account | Firebase console | ⛔ needs account |
| 0.10 | Cloudflare account: Workers, R2 bucket, domain | Cloudflare dashboard | ⛔ needs account |
| 0.11 | Paystack test-mode keys | Paystack dashboard | ⛔ needs account |
| 0.12 | CI: GitHub Actions running types, lint, unit tests | `.github/workflows/ci.yml` | ⬜ |
| 0.13 | Figma components and high-fidelity homepage and product-page mockups | Figma | ⬜ (Malik) |

## Phase 1 — MVP: she can sell

### Worker API (`workers/api`)

| # | Step | Status |
| --- | --- | --- |
| 1.1 | Worker skeleton (Hono router), zod-validated inputs, rate limiting on checkout and search | ⬜ |
| 1.2 | Firestore REST client with a service-account token (JWT signed in the Worker, cached) | ⬜ |
| 1.3 | Catalogue build on publish → cached JSON at the edge; local dev serves the seed catalogue | ⬜ |
| 1.4 | Search index build + browser search with typo tolerance and synonyms | ⬜ |
| 1.5 | Checkout: validate bag against live stock, reserve for 15 minutes, create `pending` order | ⬜ |
| 1.6 | Paystack initialise transaction (amount in kobo, order id as reference) | ⬜ |
| 1.7 | Paystack webhook: HMAC SHA-512 signature check, re-verify, one Firestore transaction, idempotent | ⬜ |
| 1.8 | Cron every 5 minutes: release expired reservations, cancel stale unpaid orders | ⬜ |
| 1.9 | Confirmation email (Resend) + push and email alert to her | ⬜ |
| 1.10 | Analytics events to Workers Analytics Engine | ⬜ |

### Storefront (`apps/storefront`)

| # | Step | Status |
| --- | --- | --- |
| 1.11 | React Router v7 framework mode on Cloudflare Workers, SSR, tokens and fonts wired | ⬜ |
| 1.12 | Layout: header (horizontal lockup, search, bag), footer, skip link, focus styles | ⬜ |
| 1.13 | Home: hero per line, category tiles, new-in | ⬜ |
| 1.14 | Category pages: Fabrics, Lingerie, Ready-to-Wear, with filters and sort | ⬜ |
| 1.15 | Product page: gallery, yard or size picker, live stock, sold-out state, add to bag | ⬜ |
| 1.16 | Bag drawer (add-to-bag motion to bag icon), persisted bag | ⬜ |
| 1.17 | One-page guest checkout → Paystack → confirmation page | ⬜ |
| 1.18 | Order tracking page (order number + email) | ⬜ |
| 1.19 | Empty, error, 404 and offline states using the illustrations | ⬜ |
| 1.20 | SEO: meta, Open Graph, product structured data, sitemap | ⬜ |

### Dashboard (`apps/dashboard`)

| # | Step | Status |
| --- | --- | --- |
| 1.21 | Vite + React PWA, installable, Firebase Auth login with admin claim | ⬜ |
| 1.22 | Today screen: money in today, this week, this month | ⬜ |
| 1.23 | Products: add or edit from her phone, photos resized in the browser (400/800/1200/2000, AVIF + WebP) to R2 | ⬜ |
| 1.24 | Stock levels and low-stock flags | ⬜ |
| 1.25 | Orders board: New → Packed → Sent | ⬜ |
| 1.26 | One-tap print: A4 invoice and 80 mm thermal slip | ⬜ |
| 1.27 | Push notification per paid order | ⬜ |

### Phase 1 quality gate

| # | Check | Status |
| --- | --- | --- |
| 1.28 | Playwright end-to-end: browse → bag → checkout → paid (Paystack test) → order in dashboard | ⬜ |
| 1.29 | axe accessibility: zero serious or critical | ⬜ |
| 1.30 | Lighthouse mobile, throttled 4G: LCP < 2.5 s, CLS < 0.1, INP < 200 ms, home JS < 200 KB | ⬜ |
| 1.31 | 20 concurrent purchases of the last units leave stock correct | ⬜ |
| 1.32 | Every acceptance check in PLAN.md "Phase 1 is done when" passes | ⬜ |

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

## Blocked: needed from Malik and her

1. Firebase project (with owner access for the build), Cloudflare account, Paystack account in test mode.
2. Delivery: Lagos plus nationwide flat rates? Zone names and fees.
3. Real products for launch: titles, prices, stock, photos (per PLAN.md photo spec).
4. Policies: delivery, returns, privacy (placeholders `[TBC]` until then).
5. Campaign photography for hero and category tiles.
