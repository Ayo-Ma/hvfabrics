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
