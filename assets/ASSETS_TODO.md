# Assets to do

Kept by Claude Code (PLAN.md, Assets and uploads). Prompts for each item are in `ASSET_PROMPTS.md`.
When a file arrives, put it at the path shown and tick it here.

## Missing — using a placeholder

| Asset | Path | Placeholder in use | Needed for |
| --- | --- | --- | --- |
| Product photos (front, drape, macro per product) | `photography/products/<line>/<slug>/01.jpg …` | `placeholders/placeholder-product.svg` | Phase 1 — every product page |
| Home hero images (fabrics, lingerie, ready-to-wear) | `photography/campaign/hero-<line>.jpg` | `placeholders/placeholder-hero.svg` | Phase 1 — home |
| Category tiles | `photography/campaign/tile-<line>.jpg` | `placeholders/placeholder-hero.svg` | Phase 1 — home |
| Default share image | `brand/social/og-default-1200x630.jpg` | none yet (falls back to the logo) | Phase 1 — link previews |
| Per-line share images | `brand/social/og-<line>-1200x630.jpg` | none | Phase 1 |
| Shop and founder photos | `photography/campaign/about-*.jpg` | none | Phase 1 — About |
| Packaging photo | `photography/campaign/trust-packaging.jpg` | none | Phase 1 — trust section |

## Received but needs work

| Asset | Issue | Fix |
| --- | --- | --- |
| Illustrations (10 files) | Delivered as PNG renamed `.svg` (AI-generated raster, 1254 px). Renamed to `.png`; web copies are 480 px WebP in `packages/ui/src/illustrations/`. | Replace with true SVGs when available; file names stay the same. |
| `illustrations/error.svg` | Real SVG, but its accent uses a CSS variable that some renderers draw black. | Check in the browser; fine in the site, which defines the variable. |
| Social icons (whatsapp, instagram, tiktok) | Need checking against each brand's current guidelines before launch. | Malik to review. |
| Logo set | Auto-traced from the PNGs; keeps the source's small irregularities. 16 px favicon is busy. | Optional hand refinement by Malik. |

## Later phases

- Hero video loops, macro clips (Phase 3)
- Occasion stories: Owambe, wedding, everyday (Phase 3)
- Size and measuring guides (lingerie Phase 3; yards guide and fabric width when she supplies the numbers)
