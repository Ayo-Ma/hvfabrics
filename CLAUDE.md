# Harries Vogue — rules for Claude Code

Spec: `docs/PLAN.md`. Order of work and status: `docs/IMPLEMENTATION.md`. Read both before changing code.

## How to work
- Build one phase at a time. Don't start the next phase until every acceptance check of the current one passes.
- Decision not covered by PLAN.md: ask Malik. Never guess on payments, data model, brand or copy.
- Never invent product copy, prices or policies. Use visible placeholders: `[TBC: delivery policy]`.
- Never create brand art, icons or illustrations. Use `assets/`. Missing asset → neutral grey `placeholder-<name>.svg` + an entry in `assets/ASSETS_TODO.md`. (Exception agreed 2026-11-12: tracing the existing logo.)
- Small commits with clear messages. Keep `CHANGELOG.md` per phase. Update the status in `docs/IMPLEMENTATION.md`.

## Repo
pnpm workspaces + Turborepo. Run pnpm via `corepack pnpm …` (pnpm is not installed globally).
- `apps/storefront` React Router v7 framework mode (SSR) on Cloudflare Workers
- `apps/dashboard` React + Vite PWA
- `workers/api` Cloudflare Worker (Hono): catalogue, search index, checkout, Paystack webhook, events, cron
- `packages/ui` tokens (CSS variables), shared components, icon components
- `packages/core` types + zod schemas, money utils, Firestore REST client, Paystack client

## Tech rules
- TypeScript strict. zod validates every API input and webhook body.
- Tailwind v4; tokens defined once in `packages/ui/src/tokens.css`.
- Money: integer minor units (kobo, cents) + currency code. Never floats.
- Dates: ISO 8601 UTC in storage; viewer's time zone on screen.
- Images: `width`, `height`, `srcset`, alt text, always. Sizes 400/800/1200/2000, AVIF + WebP.
- Storefront never reads Firestore from the browser; it reads the Worker's cached catalogue JSON.
- Motion: `motion` for UI, GSAP for scroll, R3F only in Phase 3. Lazy-load heavy libraries. Respect `prefers-reduced-motion`.
- Banned: decorative parallax, auto-rotating carousels, blob shapes, custom cursors, splash screens, pop-ups on arrival.

## Brand
- Black `#0A0A0A`, Off-white `#FAFAF7`, Harries Yellow `#FDCE02` (accent only: primary buttons with black text, focus rings, tags). Never yellow text on a light background.
- Satoshi only (decided 2026-11-13; Poppins dropped): Black/Bold for headings with tracking −2% to −3%, Regular/Medium for body and UI. Logo is the only serif element.
- Header uses `assets/brand/logo/hv-lockup-horizontal.svg`.

## Secrets
Wrangler secrets and `.dev.vars` only, never in the repo: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `FCM_VAPID_KEY`.

## Quality gates (CI)
tsc + ESLint zero errors · Vitest (money, stock, order logic fully covered) · Playwright E2E with Paystack test mode · axe zero serious/critical · Lighthouse mobile LCP < 2.5 s, CLS < 0.1, INP < 200 ms, home JS < 200 KB.
