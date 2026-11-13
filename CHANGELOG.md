# Changelog

## Phase 0 — Foundation

- Repo: pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier.
- Assets organised into the PLAN.md layout; logo traced to SVG; favicons and app icons generated.
- Fonts self-hosted: Satoshi (700, 900), Poppins (400, 500, 600), plus a Plus Jakarta Sans ₦-only subset because neither main font has the ₦ glyph.
- @hv/ui: design tokens (Tailwind v4 theme), 58 generated icon components, 480 px WebP illustrations, grey placeholders; `assets/ASSETS_TODO.md`.

## Phase 1 — MVP (in progress)

- Storefront (React Router 7 on Cloudflare Workers, SSR): home, Fabrics / Lingerie / Ready-to-Wear with in-stock filter and sort,
  product page with the tape-measure yard picker and size picker, bag drawer with add-to-bag motion, one-page checkout with
  server-side validation, order confirmation, order tracking, search with typo tolerance, policies, 404 and error states.
- Runs on the placeholder seed catalogue until the API Worker is connected; production refuses placeholder data.
