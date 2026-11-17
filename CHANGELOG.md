# Changelog

## Phase 0 — Foundation

- Repo: pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier.
- Assets organised into the PLAN.md layout; logo traced to SVG; favicons and app icons generated.
- Fonts self-hosted: Satoshi (400, 500, 700, 900) — Poppins dropped 2026-11-13 — plus a Plus Jakarta Sans ₦-only subset because Satoshi has no ₦ glyph.
- @hv/ui: design tokens (Tailwind v4 theme), 58 generated icon components, 480 px WebP illustrations, grey placeholders; `assets/ASSETS_TODO.md`.

## Phase 1 — MVP (in progress)

- Storefront (React Router 7 on Cloudflare Workers, SSR): home, Fabrics / Lingerie / Ready-to-Wear with in-stock filter and sort,
  product page with the tape-measure yard picker and size picker, bag drawer with add-to-bag motion, one-page checkout with
  server-side validation, order confirmation, order tracking, search with typo tolerance, policies, 404 and error states.
- Runs on the placeholder seed catalogue until the API Worker is connected; production refuses placeholder data.
- Fonts: Poppins dropped; Satoshi (400/500/700/900) is the only typeface.
- API Worker (`workers/api`, Hono): catalogue + search index in KV, settings, checkout with atomic 15-minute stock holds,
  Paystack initialise, signed + re-verified + amount-checked idempotent webhook, order lookup for confirmation and
  tracking, analytics events, 5-minute expiry cron, Resend emails. Firestore REST store with service-account auth and
  retried transactions; in-memory store for local dev. Firestore security rules and index. 21 tests.
- Storefront now reads the catalogue and runs checkout through the API when `API_URL` is set.
- Dashboard (`apps/dashboard`, React + Vite PWA): sign-in (Firebase Auth; dev roles locally), Today (money in today / this
  week / this month in her time zone, orders to pack, cutting list, running low), orders board New → Packed → Sent with undo,
  order page with call / WhatsApp / email, one-tap 80 mm slip and A4 invoice, products list and phone-first editor with
  in-browser photo resizing (400/800/1200/2000, AVIF + WebP) uploaded to R2, stock screen, order alerts on this phone with a
  test alert. Installable, works on a weak connection.
- API: `/admin/*` (Firebase ID-token check with admin claim and role, CORS locked to the dashboard), products and stock
  writes that respect shoppers' holds, board moves, takings, R2 photo upload with type and size checks, image serving,
  FCM push per paid order, dev-only sample orders. `scripts/set-admin.mjs` grants dashboard access. 34 API tests, 57 core tests.
- First production deploy on Cloudflare (workers.dev): API, storefront, dashboard. Storefront reaches the API over a
  service binding; photos from R2 served through the shop's own address with edge caching.
- Quality gate: Playwright end-to-end (browse → 5 yards → pay → confirmation → dashboard → stock down; sold-out can't be
  bought), axe on 18 screens with zero serious/critical issues, Lighthouse budget passing on the live site
  (LCP 2.15–2.31 s, CLS 0, TBT 0 ms, home JS 169 KB), 20-buyer race on the real Firestore (exactly 5 sold).
  CI workflow for every push. Fixes from the gate: keyboard access to the product gallery, home headline no longer
  hidden by the entrance animation, catalogue cached per Worker isolate, "Illegal invocation" on Workers.
