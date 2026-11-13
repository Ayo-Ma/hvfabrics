# Harries Vogue — Asset List and Prompts

Every asset the storefront and dashboard need, based on `Harries Vogue — Website & Dashboard Plan.md`. Items marked **[added]** are not in the plan; they are my estimate of what the build will also need.

## Read this first

**Who makes what**

| Maker | Assets |
| --- | --- |
| Malik (vector, by hand) | Logo set, favicons, icons, illustrations, motifs, patterns, brand shapes. AI output can be a sketch to trace, but the shipped file must be a hand-built SVG. |
| Her (camera) | Every product photo, every photo of a real fabric or garment that is for sale, shop and portrait photos. |
| AI image tools (ChatGPT, Nano Banana) | Mood boards, layout placeholders, backgrounds with no product in them, and **edits** of her real photos (clean background, upscale, fix lighting). |
| Claude Code | Grey `placeholder-<name>.svg` files only, plus `ASSETS_TODO.md`. |

**Rules that apply to every prompt**

1. **Never show a fabric or garment that doesn't exist.** An AI-generated lace on a model is a lie to the customer if it sits next to a "Shop" button. AI images that show garments are for mood boards and dev placeholders only. Final campaign images use her real products.
2. **AI editing never changes colour or texture.** Each edit prompt below says so explicitly. Keep the original file.
3. **Brand colours:** Black `#0A0A0A`, Harries Yellow `#FDCE02` (sampled from `logo_yellow.png`; the plan's `#FDCE02` was an estimate), Off-white `#FAFAF7`. Yellow is an accent only. No yellow text on light backgrounds.
4. **Banned look:** generic blob shapes, glossy gradients, decorative parallax backdrops, stock-photo smiles, splash screens.
5. **Trademark:** don't print the name on anything (OG images, packaging) until the lawyer has cleared "Harries Vogue".

**Tip for AI tools:** paste the whole prompt, including the "Avoid" line. If the tool lets you set an aspect ratio, set it as well as stating it in the prompt.

---

## Summary

| # | Asset | Path | Maker | Phase |
| --- | --- | --- | --- | --- |
| 1.1 | Primary logo, full stacked lockup (yellow on black) | `brand/logo/harries-vogue-primary.svg` | Malik (trace of `logo_black.png`) | 0 |
| 1.2 | Secondary logo (black on yellow) | `brand/logo/harries-vogue-secondary.svg` | Malik | 0 |
| 1.3 | Horizontal header lockup **[added]** | `brand/logo/hv-lockup-horizontal.svg` | Malik | 0 |
| 1.4 | HV monogram + simplified small version | `brand/logo/hv-monogram.svg`, `hv-monogram-small.svg` | Malik | 0 |
| 1.5 | Wordmark, mono monograms, ornament **[ornament added]** | `brand/logo/hv-wordmark.svg`, `hv-monogram-mono.svg`, `hv-ornament.svg` | Malik | 0 |
| 1.6 | Thermal-print logo **[added]** | `brand/logo/hv-print-mono.svg` | Malik | 1 |
| 1.7 | Email header logo **[added]** | `brand/logo/hv-email-header.png` | Malik | 1 |
| 1.8 | Favicon set | `brand/favicon/*` | Malik | 0 |
| 1.9 | Dashboard app icon **[added]** | `brand/favicon/dashboard-*` | Malik | 1 |
| 1.10 | Default social share image | `brand/social/og-default-1200x630.jpg` | Malik + AI bg | 1 |
| 1.11 | Per-line share images **[added]** | `brand/social/og-<line>-1200x630.jpg` | Malik + her photos | 1 |
| 2 | UI icons (27 planned + 22 added) | `icons/*.svg` | Malik | 1 |
| 3.1–3.5 | Illustrations: empty bag, no results, order success, 404, offline | `illustrations/*.svg` | Malik | 1 |
| 3.6–3.11 | Illustrations **[added]**: payment failed, sold out, empty orders, empty products, no alerts, server error | `illustrations/*.svg` | Malik | 1–2 |
| 4.1 | Needle and thread motif | `illustrations/motif-needle-thread.svg` | Malik | 1 |
| 4.2–4.4 | Textile patterns (one per line) | `patterns/pattern-<line>.svg` | Malik | 1 |
| 4.5 | Brand shapes for layered cut-outs **[added]** | `patterns/shape-*.svg` | Malik | 3 |
| 4.6 | Measuring-tape divider **[added]** | `patterns/divider-tape.svg` | Malik | 1 |
| 5.1–5.3 | Home hero images (one per line) | `photography/campaign/hero-<line>.jpg` | Her shoot (AI for mood) | 1 |
| 5.4–5.6 | Category tiles | `photography/campaign/tile-<line>.jpg` | Her shoot | 1 |
| 5.7–5.9 | Occasion stories: Owambe, wedding, everyday | `photography/campaign/occasion-<name>-*.jpg` | Her shoot | 3 |
| 5.10 | Macro texture set (scroll zoom) | `photography/campaign/macro-*.jpg` | Her shoot | 3 |
| 5.11–5.12 | Shop and founder photos **[added]** | `photography/campaign/about-*.jpg` | Her | 1 |
| 5.13 | Packaging and delivery photo **[added]** | `photography/campaign/trust-packaging.jpg` | Her | 1 |
| 6 | Product photo shoot + AI edit prompts | `photography/products/<line>/<slug>/` | Her + AI edit | 1 |
| 7.1 | "How many yards?" guide **[added]** | `illustrations/guide-yards.svg` | Malik | 1 |
| 7.2 | Lingerie measuring guide | `illustrations/guide-lingerie-measure.svg` | Malik | 3 |
| 7.3 | Ready-to-wear measuring guide **[added]** | `illustrations/guide-rtw-measure.svg` | Malik | 3 |
| 7.4 | Fabric width diagram **[added]** | `illustrations/guide-fabric-width.svg` | Malik | 1 |
| 8.1–8.3 | Hero video loops (one per line) | `video/hero-<line>.mp4/.webm` | Her shoot | 3 |
| 8.4 | Lace macro clip for product pages | `video/macro-<slug>.mp4` | Her shoot | 3 |
| 9 | Fonts (download, no prompt) | `fonts/` | Download | 0 |

---

## 1. Brand identity

> **Status, Nov 12, 2026: logo set traced by Claude Code from `logo_black.png` and `logo_yellow.png`, at your request.** Auto-traced with potrace at 4× resolution: the full logo matches the original PNG at 99.2% overlap on the monogram and about 97% on the thinner wordmark and tagline. These are traces, so they keep the source's small irregularities (the logo looks AI-generated). Malik can still hand-refine them later using the briefs below; the file names won't change.
>
> | Done | File |
> | --- | --- |
> | ✓ | `logo/harries-vogue-primary.svg`, `-primary-transparent.svg`, `-secondary.svg`, `-mono.svg` (full stacked logo) |
> | ✓ | `logo/hv-lockup-horizontal.svg` (header), `hv-lockup-horizontal-small.svg` (bold monogram, for under 40 px tall) |
> | ✓ | `logo/hv-monogram.svg`, `hv-monogram-mono.svg`, `hv-monogram-small.svg`, `hv-monogram-small-mono.svg` (small = thickened, needle eye closed) |
> | ✓ | `logo/hv-wordmark.svg`, `hv-ornament.svg` (single file; not yet split into three stretchable parts) |
> | ✓ | `logo/hv-print-mono.svg` (thickened for thermal printers: test on the real printer) |
> | ✓ | `logo/hv-email-header.png`, `hv-email-header-light.png` |
> | ✓ | `favicon/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png` |
> | ✓ | `favicon/dashboard-apple-touch-icon.png`, `dashboard-192.png`, `dashboard-512.png`, `dashboard-maskable-512.png` (yellow, without the bar-chart tab) |
> | ✓ | `logo/source/` (copies of the original PNGs) |
>
> **Known limits:** at 16 px the favicon is still busy. A hand-simplified 16 px version (shorter swash, no head dot) would be sharper. The swash was not shortened in the small monogram. Still to make: the share images (1.10, 1.11), which need a background image first.

### What the current logo is

**Source files:** `logo_black.png` and `logo_yellow.png` at the repo root. Both are 1254 × 1254 PNG rasters with the same layout and the colours swapped. Move them to `assets/brand/logo/source/` as the reference originals. Never use them on the site.

**Sampled colours:** yellow is `#FDCE02` (the flat background of `logo_yellow.png`; it reads `#FECD06` on the black version, because of edge blending). Black is pure `#000000`. The site's black is `#0A0A0A`, so the SVG background must be `#0A0A0A`, not `#000000`; otherwise the logo shows as a slightly different black box on the page.

**Anatomy, top to bottom** (every logo prompt below refers to these names):

1. **HV monogram:** a high-contrast serif H and V interlocked.
   - **H left stem:** sweeps down past the baseline and curves left into a long tapering tail, like a J.
   - **Needle crossbar:** the H's crossbar is drawn as a thin sewing needle. The eye is a narrow slot near the V end, and the point is at the left stem.
   - **Shared stem:** the V's left arm doubles as the H's right stem. It has a curled, hooked top serif and a bracketed foot serif at the base.
   - **Swash:** the V's right arm keeps rising past the cap height into a long tapering swash, which curves out to the top right. It is the widest and highest point of the logo.
   - **Head dot:** a solid round dot above the monogram, over the shared stem.
2. **Ornament:** a solid dot with a small four-point sparkle directly under it, between two thin horizontal rules of equal length.
3. **Wordmark:** "HARRIES VOGUE" in widely letterspaced, high-contrast serif capitals.
4. **Tagline:** "WEAR CONFIDENCE." (with the full stop) in small, very widely spaced thin capitals, between two short rules.

**Problems to fix in the redraw:**
- It's a raster with soft, slightly uneven edges, so it blurs on retina screens and print.
- The needle eye and the bars to either side of it blur together, and the eye is only a few pixels wide.
- The tagline, sparkle and needle eye disappear below about 200 px wide.
- The stacked square layout is far too tall for a website header. The site needs a horizontal version (1.3).
- The monogram's visual centre sits about 3% right of the wordmark's centre, because of the swash. Malik decides whether that's intended or should be centred optically.

**Trademark:** "VOGUE" is set as large as "HARRIES". The trademark check in the plan still applies before anything is printed.

### 1.1 Primary logo, full stacked lockup — `harries-vogue-primary.svg`

**Spec:** SVG, yellow on `#0A0A0A`, all four parts (monogram, ornament, wordmark, tagline). Used for the About page, the footer on large screens, share images, packaging and the email footer. Not for the header.

**Prompt (brief for Malik):**
> Trace `logo_black.png` as a vector, faithfully. This is a redraw, not a redesign: keep every shape, proportion and position. Enlarge the PNG to 400% and place it at 30% opacity on a locked layer, then build each part as clean paths on top.
>
> **Monogram:** draw the H, the shared stem and the V as separate closed shapes first, then join them. Keep the H left stem's J-tail tapering to a fine point that ends the same distance below the baseline as in the original. Make the curve one continuous arc with no flat spots, and put handles horizontal or vertical at each extreme. Draw the needle crossbar as a true needle: a thin shaft that tapers to a point at the left stem, with a clean elongated eye slot near the V end, and the eye's inside a proper cut-out (a hole in the path, not a black shape on top). Make the eye at least 1.2% of the logo width long and its opening at least 0.4%, so it survives at 300 px wide. Keep the shared stem's hooked top serif and the bracketed foot serif. Draw the swash as one smooth tapering stroke, from full stem weight at the bottom to a hairline point at the top right, with no kinks where it passes the cap height. The head dot is a perfect circle; match its diameter and position to the original.
>
> **Ornament:** a perfect circle, with the four-point sparkle below it drawn as four concave-sided points meeting at the centre, and its vertical points slightly longer than its horizontal ones, as in the original. The two rules are the same length and the same weight, and they align exactly with the dot's vertical centre line.
>
> **Wordmark:** identify the typeface if it's a real font. It looks close to a classical Roman inscriptional serif, in the family of Trajan or Cinzel. If it is one, check that the licence allows logo use, and say which font it is. If it doesn't match any font (it may be AI-generated), trace each letter. Either way, every repeated letter must be identical: both Rs, both Es and the paired S shapes. Keep the original wide letterspacing, then fix the optical kerning so the gaps around A, V and the R legs look even.
>
> **Tagline:** "WEAR CONFIDENCE." Identify or trace it the same way, and keep the full stop. Match the rule lengths to the original.
>
> **Finish:** convert all text to outlines, merge each part into compound paths, and give it a full-bleed `#0A0A0A` background rectangle with the mark in Harries Yellow `#FDCE02` (confirm it by eye against printed samples). Clear space on every side is the height of the wordmark's H. Export with a `viewBox`, no width or height, no embedded images, no hidden layers and no group transforms, then run SVGO. Also deliver it without the background rectangle as `harries-vogue-primary-transparent.svg`. Overlay the finished vector at 50% on the PNG to prove the shapes match.
>
> Avoid: "improving" the swash or the J-tail, swapping to a different serif, gradients, glows, outlines, shadows, metallic gold effects, and stretching anything to fit.

### 1.2 Secondary logo — `harries-vogue-secondary.svg`

**Spec:** SVG, black on yellow, matching `logo_yellow.png`. For packaging, stickers, Instagram highlights and the shopping bag. Never on the website's light pages.

**Prompt (brief for Malik):**
> Take the finished paths from 1.1 with no changes to any curve, fill them with `#0A0A0A`, and place them on a full-bleed `#FDCE02` rectangle. Keep the same clear space. Compare the result with `logo_yellow.png` at the same size. Dark on yellow looks slightly heavier than yellow on dark, but keep the shapes identical in both files anyway, so the brand never has two different logos. Check that the needle eye still reads, since dark shapes close up visually. Export with a `viewBox`, no fixed size, SVGO-optimised.
>
> Avoid: a "softer" yellow for this version and any background texture.

### 1.3 Horizontal header lockup — `hv-lockup-horizontal.svg` **[added]**

**Why:** the header is 56–64 px tall on a phone. In the square stacked logo at that height, the wordmark would be about 5 px tall and unreadable. The header needs the monogram and wordmark side by side.

**Prompt (brief for Malik):**
> Build a single-line horizontal lockup from the 1.1 paths: the HV monogram on the left and "HARRIES VOGUE" on the right, with no ornament and no tagline. Scale the monogram so its cap height, from the top of the H to the baseline, matches 1.6× the wordmark's cap height. The swash and J-tail may then extend above and below the line, which is part of the character. Vertically centre the wordmark on the H's cap height, not on the swash. The gap between the end of the monogram's needle and the first letter equals the width of the wordmark's H. In this small version, the head dot can stay; check whether the needle eye survives at 40 px tall. If it doesn't, deliver a `hv-lockup-horizontal-small.svg` where the eye is closed into a plain, slightly thicker crossbar. Fill with `currentColor`, transparent background, a tight `viewBox`. Test it at 32, 40 and 48 px tall on a real phone.
>
> Avoid: shrinking the wordmark letterspacing to save width, and moving the swash.

### 1.4 HV monogram — `hv-monogram.svg`

**Spec:** SVG, square artboard, yellow on `#0A0A0A`. For the favicon, app icons, avatar, dashboard sidebar and small spaces.

**Prompt (brief for Malik):**
> Extract the HV monogram from 1.1, including the head dot, with no wordmark, ornament or tagline. Don't redesign it: the monogram already exists. Place it on a square artboard and centre it optically: the swash makes the right side heavier, so balance by eye, not by the bounding box. Padding is 10% of the artboard on the tightest side. Yellow `#FDCE02` on `#0A0A0A`. Deliver it with and without the background square.
>
> Also make a **simplified small version**, `hv-monogram-small.svg`, for 16–48 px. Close the needle eye into a solid crossbar and thicken it to at least 6% of the monogram height. Shorten the swash so it ends at about two-thirds of its current length, keeping the same curve, so the mark fits a square without shrinking. Thicken the J-tail's thinnest part to at least 4% of the height. Keep the head dot. Test both versions side by side at 16, 32 and 48 px; the small one must still read as "HV".
>
> Avoid: circles, shields or crowns around the letters, and changing the letter shapes in the full-size version.

### 1.5 Wordmark and mono monogram — `hv-wordmark.svg`, `hv-monogram-mono.svg`

**Spec:** SVG, `currentColor`, transparent, tight `viewBox`.

**Prompt (brief for Malik):**
> (a) `hv-wordmark.svg`: "HARRIES VOGUE" alone, from the 1.1 paths, on one line, keeping the original letterspacing. Fill is `currentColor` so the site can show it in black, yellow or off-white. The `viewBox` hugs the letters with no padding. Used in the footer and in small places where the monogram is already visible nearby.
>
> (b) `hv-monogram-mono.svg` and `hv-monogram-small-mono.svg`: the two monograms from 1.4 as single compound paths with `fill="currentColor"`. The needle eye must be a real hole cut through the path, so it shows on any background.
>
> (c) `hv-ornament.svg` **[added]**: the dot-sparkle-rules ornament alone, `currentColor`. The website uses it as a section divider and in emails, so it ties the site back to the logo. The rules must stretch: deliver it as three parts (left rule, centre dot and sparkle, right rule), so CSS can extend the rules to any width.
>
> Avoid: hard-coded fill colours and live text.

### 1.6 Thermal-print logo — `hv-print-mono.svg` **[added]**

**Why:** the 80 mm thermal slip prints at about 203 dpi in pure black. The normal logo's hairlines vanish.

**Prompt (brief for Malik):**
> Make a print-only version of the horizontal lockup (1.3) for an 80 mm thermal receipt printer, using the small monogram with the needle eye closed. The J-tail and swash hairlines will vanish at this resolution, so thicken their thinnest points to the same 3-dot minimum below, and drop the head dot if it prints as a smudge. It prints at 203 dpi, black only, with no grey. Shown 48 mm wide, the wordmark is about 380 printer dots across. Thicken every hairline to at least 3 printer dots (about 0.38 mm at that width), simplify serifs that would fill in, and open up small counters (the insides of a, e and s) so ink doesn't close them. Pure `#000000` fill on transparent, with no tints. Test it by printing on an actual thermal printer or, failing that, at 203 dpi on paper and checking with a loupe.
>
> Avoid: halftones, grey and any detail finer than 0.3 mm.

### 1.7 Email header logo — `hv-email-header.png` **[added]**

**Why:** Gmail and Outlook don't display SVG. Confirmation emails need a PNG.

**Prompt (brief for Malik):**
> Export a PNG header for transactional emails (order confirmation, shipped, password reset). The canvas is 1200 × 240 px (shown at 600 × 120), solid `#0A0A0A` background, with the yellow horizontal lockup (1.3) centred horizontally and vertically, the wordmark's capitals 40 px tall at 2× (the swash and J-tail extend beyond that). No tagline and no extra graphics. Also export the ornament (1.5c) as `hv-email-divider.png` (1200 × 40, transparent) for between email sections. Make it a 24-bit PNG under 30 KB. Also export a version with the black wordmark on `#FAFAF7` as `hv-email-header-light.png`, for clients that force light mode.

### 1.8 Favicon set — `brand/favicon/`

**Spec:** `favicon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `maskable-512.png`.

**Prompt (brief for Malik):**
> Create the browser and home-screen icons from the **simplified small monogram** (`hv-monogram-small.svg` from 1.4, with the needle eye closed and the swash shortened). The full monogram's needle eye, hairline swash tip and J-tail point turn to mush below 48 px.
> - `favicon.svg`: the small monogram in yellow `#FDCE02` on a `#0A0A0A` square with 18% corner radius. Keep the black square in light and dark mode, so it never vanishes on a dark tab bar. At 16 px, also drop the head dot if it merges with the shared stem's hooked serif. Check it in a real Chrome tab and a real Safari tab.
> - `apple-touch-icon.png`: 180 × 180, square with no transparency and no rounded corners (iOS adds them), black background, yellow monogram filling 62% of the width.
> - `icon-192.png` and `icon-512.png`: the same as the touch icon at those sizes.
> - `maskable-512.png`: 512 × 512 full-bleed black, with the monogram inside the central circular safe zone (a circle 80% of the canvas wide, so the monogram is at most about 300 px wide). Check it with maskable.app against the circle, squircle and teardrop masks.
>
> Avoid: transparent backgrounds on the PNGs, thin outlines, and putting the full "Harries Vogue" name in any icon.

### 1.9 Dashboard app icon — `brand/favicon/dashboard-*.png` **[added]**

**Why:** she may install both the shop and the dashboard on her phone. They need to look different at a glance.

**Prompt (brief for Malik):**
> Make a variant of the app icon for the owner's dashboard. Invert the colours: a Harries Yellow background with the black small monogram (`hv-monogram-small.svg`). Add a small black square tab in the bottom-right corner, 22% of the icon width, holding a simple white upward bar-chart glyph: three bars at 1.5 px stroke weight relative to 24 px. It must still pass the maskable safe zone, so keep the tab inside the 80% circle. Export at 180, 192 and 512, plus `dashboard-maskable-512.png`. The two icons should be told apart instantly side by side on an Android home screen: shop is black, dashboard is yellow.
>
> Avoid: the word "Admin" or any text on the icon.

### 1.10 Default social share image — `og-default-1200x630.jpg`

**Spec:** 1200 × 630 JPG under 300 KB. Shows when someone shares a link on WhatsApp, Instagram DM, X or Facebook. WhatsApp crops the centre to a near-square, so key content goes in the middle 630 × 630.

**Prompt for the background (AI tool, no product shown):**
> A wide 1200 × 630 editorial still life on a deep black background, `#0A0A0A`. Across the lower third, a length of plain unpatterned black silk-satin falls in soft, heavy folds from the left edge, catching one narrow, warm highlight from a single softbox high on the right, so the folds read as gold-tinted ridges. The upper two-thirds are near-black empty space, for a logo to sit on later. Shot like a fashion still life on a medium-format camera, 80 mm lens, f/8, sharp throughout, with rich deep blacks and no visible noise. The mood is quiet, expensive and calm. Colour: black and warm graphite only, with the highlight a muted gold near `#C9A227`; no other colours. No text, no logo, no people, no props, no patterned fabric, no sequins.
>
> Avoid: blue or purple tints, smoke, sparkles, bokeh dots, gradients that look digital, and any lace or print (those would imply a real product).

**Then (Malik):** place the full stacked primary logo (1.1, transparent version) inside the centre 630 × 630 square, 420 px tall, so it survives WhatsApp's square crop. The tagline "WEAR CONFIDENCE." is already part of it, so add no other text. Export as JPG at 82% quality.

### 1.11 Per-line share images — `og-fabrics`, `og-lingerie`, `og-rtw` **[added]**

**Why:** a shared Lingerie link should look like lingerie, not the generic black image.

**Prompt (brief for Malik, using her real photos):**
> Make three 1200 × 630 share images, one per product line, from her real campaign photos.
> - **Fabrics:** a bright, colour-led crop of real folded fabrics on off-white. Fill the left 60% with the photo; the right 40% is solid `#0A0A0A` with the yellow wordmark and the word "Fabrics" in Satoshi Black at 64 px, tracking −3%, in `#FAFAF7`.
> - **Lingerie:** a darker, warmer crop of a real lingerie piece on a draped dark surface, the same layout, with the word "Lingerie".
> - **Ready-to-wear:** an editorial crop of a model in a real garment, framed so the face and garment fall inside the centre 630 px square (WhatsApp crops to it), with the word "Ready-to-Wear".
>
> Keep the photo's colours exactly as shot: no filters and no colour grade. Export as JPG at 82% quality, under 300 KB each.

---

## 2. UI icons — `assets/icons/`

**Spec for every icon:** 24 × 24 grid, 2 px padding (live area 20 × 20), 1.5 px stroke, round caps and joins, `stroke="currentColor"`, `fill="none"` (unless noted), kebab-case filename, SVGO-optimised, `viewBox="0 0 24 24"`, no width or height.

**Master prompt (brief for Malik — apply to every icon below):**
> Draw a custom outline icon set for a premium Nigerian fashion and fabrics store. The style is calm, precise and slightly soft: a 1.5 px stroke on a 24 px grid, round line caps and round joins, 2 px corner radius on rectangles, and circles drawn as true circles. Keep the set visually even: every icon should feel the same weight when lined up in a row. Larger, simple shapes like the bag fill about 18 × 18 px; narrow shapes like the chevrons are centred optically. Keep detail low: each icon should be recognisable at 16 px. Snap all horizontal and vertical lines to the pixel grid at whole or half pixels so 1.5 px strokes render crisply. Use no fills, except where an icon notes a filled state. Social logos follow each brand's official guidelines and are the only exception to the house style. Deliver each icon as a separate SVG plus one overview sheet showing all of them at 16, 24 and 32 px, in black on white and white on black.
>
> Avoid: duotone, gradients, drop shadows, inconsistent stroke widths, and copying an existing icon library one to one.

### 2.1 Icons from the plan

| File | Draw it like this |
| --- | --- |
| `search.svg` | A 13 px circle top-left, with a 5 px handle at 45° to the bottom-right. The handle starts at the circle's edge, not its centre. |
| `bag.svg` | A shopping bag, not a basket: a trapezoid body slightly wider at the bottom, 16 px wide by 15 px tall, with a semicircular handle arch of 7 px rising from the top edge. This is the cart icon; add-to-bag animates toward it. |
| `user.svg` | A head circle of 7 px and a shoulder arc below it, open at the bottom. No full body. |
| `menu.svg` | Three horizontal lines 16 px long, 5 px apart. The middle line is 12 px, aligned left, for a subtle tailored feel. |
| `close.svg` | Two 14 px diagonals crossing at the centre. |
| `chevron-left.svg` / `chevron-right.svg` / `chevron-down.svg` | An open V of two 6 px arms at 90°, centred optically (shifted 1 px against the direction it points). |
| `plus.svg` / `minus.svg` | 14 px lines. Used in the yard and quantity stepper, so they must match each other's length exactly. |
| `check.svg` | A short arm of 5 px and a long arm of 11 px, meeting at a rounded join, slightly below centre. |
| `filter.svg` | Three horizontal lines with a small 3 px circle "slider knob" on each, at different positions (left, right, centre). |
| `sort.svg` | Two vertical arrows side by side: up on the left, down on the right, 14 px tall. |
| `truck.svg` | A side-view delivery van: a cargo box on the left, a cab on the right with an angled windscreen, and two 3.5 px wheels. Used for delivery info. |
| `return.svg` | A U-turn arrow: a line going right, curving back left in a semicircle, ending in an arrowhead pointing left. |
| `lock.svg` | A 14 × 10 px rounded rectangle body, an 8 px-wide shackle arch, and a 2 px keyhole dot. Used for "secure checkout". |
| `ruler.svg` | **Draw a tailor's measuring tape, not a ruler:** a flat ribbon curling into a loose coil on the right, with 4 tick marks along the straight part. This is the size-guide icon, and a tape is what her customers know. |
| `print.svg` | A printer body with a sheet of paper sticking out of the top and a sheet coming out of the bottom slot. |
| `bell.svg` | A classic bell outline with a small clapper arc below it. Also make `bell-dot.svg`: the same bell with a filled 5 px circle top-right, for unread alerts. |
| `chart.svg` | Three vertical bars rising left to right (6, 10, 14 px) on a baseline. |
| `box.svg` | An isometric parcel box with a tape line across the top face. Used for "packed" status. |
| `tag.svg` | A price tag rotated 45°, with a 2.5 px hole circle near the point. Used for discounts and labels. |
| `map-pin.svg` | A teardrop pin with a 5 px inner circle. |
| `whatsapp.svg` / `instagram.svg` / `tiktok.svg` | Official brand glyphs, monochrome, `currentColor`, simplified to sit on the 24 px grid. Follow each brand's guidelines; don't restyle them to 1.5 px stroke. |
| `external-link.svg` | A 12 px square open at the top-right corner, with an arrow leaving through the gap at 45°. |

### 2.2 Icons I estimate the build also needs **[added]**

| File | Where it's used | Draw it like this |
| --- | --- | --- |
| `arrow-right.svg` | "Shop the look", links | A 14 px horizontal line with an open arrowhead. |
| `arrow-up-right.svg` | Callout labels on campaign images | A 10 px diagonal with an open corner arrowhead. |
| `heart.svg` + `heart-filled.svg` | Wishlist, if approved (ask Malik) | A symmetric heart; the filled version uses `fill="currentColor"`. |
| `scissors.svg` | "Cut to your yardage" on fabric pages | Open tailor's shears: two ring handles at the bottom-left, two blades crossing toward the top-right. |
| `camera.svg` | Dashboard: take a product photo | A camera body with a 6 px lens circle and a small bump on top. |
| `image-plus.svg` | Dashboard: add a photo from the gallery | A picture frame with a mountain-and-sun line, and a small plus at the corner. |
| `edit.svg` | Dashboard: edit product | A pencil at 45° with a short underline. |
| `trash.svg` | Dashboard: delete | A bin with a lid line and two vertical inner lines. |
| `drag-handle.svg` | Dashboard: reorder photos | Six 1.5 px dots in two columns of three. |
| `eye.svg` / `eye-off.svg` | Password field, product draft or live | An almond outline with a 5 px pupil; the "off" version has a diagonal slash. |
| `home.svg` | Dashboard nav: Today | A house outline with a pitched roof and a door gap. |
| `settings.svg` | Dashboard nav | Six-tooth gear with a 6 px centre circle. |
| `users.svg` | Dashboard nav: customers | Two user icons overlapping, the back one smaller. |
| `logout.svg` | Dashboard | A door frame with an arrow leaving to the right. |
| `alert-triangle.svg` | Low stock, errors | A rounded triangle with an exclamation mark. |
| `info.svg` | Hints | A circle with an "i". |
| `copy.svg` | Copy order number, discount code | Two overlapping rounded rectangles. |
| `share.svg` | Share product to WhatsApp | Three connected nodes (the standard share glyph), or an iOS-style box with an up arrow; pick one and use it everywhere. |
| `star.svg` + `star-filled.svg` | Reviews (Phase 3) | A five-point star with slightly rounded points. |
| `phone.svg` / `mail.svg` | Contact, order details | A handset; an envelope with a V flap. |
| `globe.svg` | Currency and country picker (Phase 4) | A circle with an equator and two meridian curves. |
| `credit-card.svg` | Checkout payment step | A rounded rectangle with a stripe band and a short line for card digits. |
| `wifi-off.svg` | Offline banner (dashboard PWA) | Three wifi arcs with a diagonal slash. |
| `zoom-in.svg` | Open product image zoom | The search icon with a plus inside the circle. |
| `grid.svg` / `list.svg` | Dashboard product views | Four squares; three lines with dots. |

---

## 3. Illustrations — `assets/illustrations/`

**Shared style (paste into every illustration prompt or brief):**
> A single-weight line illustration in the style of a tailor's sketchbook: a 2 px stroke at a 240 × 240 artboard, round caps, black (`currentColor`) lines on transparent, with exactly one accent shape filled in Harries Yellow `#FDCE02`. Loose and confident, not childish: think of a fashion designer's quick pen drawing. No people's faces, no gradients, no shadows, no background scene. Objects come from her world: fabric bolts, tape measures, thread spools, pins, shears, a sewing needle, dress forms, folded cloth, the shop bag. Lots of empty space. It must read clearly at 160 px wide on a phone. Deliver as SVG, with the yellow as a separate path with `fill="var(--hv-yellow, #FDCE02)"` so developers can theme it.
>
> Avoid: blob backgrounds, confetti, cartoon mascots, 3D renders, and isometric tech-startup scenes.

AI tools can produce a raster sketch from these prompts for Malik to trace. The delivered file must be a hand-built SVG.

### 3.1 Empty bag — `empty-bag.svg`
> [Shared style.] An open shopping bag in the same shape as the bag icon, standing upright and seen slightly from above, so the empty inside is visible. A single loose length of thread drifts out of the top of the bag and curls once in the air, ending in a sewing needle. The yellow accent fills the inside back wall of the bag. The message it supports: "Your bag is empty — let's find something beautiful." Composition: the bag centred, sitting on a short ground line 60% of the artboard wide.

### 3.2 No search results — `no-results.svg`
> [Shared style.] A tailor's tape measure lying in a loose, tangled loop, with its end lifted and curled into the shape of a question mark. A small magnifying glass leans against the coil. The yellow accent fills the small metal tab at the end of the tape. The message it supports: "No match for that — try 'lace' or 'ankara'." Keep it calm, not sad.

### 3.3 Order success — `order-success.svg`
> [Shared style.] A parcel box with its flaps folded closed, tied with a single ribbon of fabric finished in a neat bow on top. A sewing needle and thread have just stitched a small tick mark into the front face of the box: the thread line forms the tick, with the needle resting at the end of the stroke. The yellow accent fills the ribbon bow. The message: "Order confirmed. We're packing it now." Feel: proud and finished.

### 3.4 404 page — `404.svg`
> [Shared style.] A dress form (tailor's mannequin) on a stand, seen front-on, wearing nothing except a measuring tape draped around its neck. A dashed "cut here" line with a small pair of open shears runs diagonally across the empty space beside it, as if the page has been cut out of a pattern. The yellow accent fills a small paper pattern tag hanging from the dress form, and on it the numbers "404" are drawn in the same line style. The message: "This page has been cut from the collection."

### 3.5 Offline — `offline.svg`
> [Shared style.] A wooden thread spool standing upright with its thread unwinding in a long gentle line that runs off to the right and stops in a loose, frayed end, unconnected. A tiny wifi symbol with a slash sits above the frayed end. The yellow accent fills the thread wrapped on the spool. Used on the dashboard PWA when her phone loses signal: "You're offline. Changes will save when you're back."

### 3.6 Payment failed — `payment-failed.svg` **[added]**
> [Shared style.] A bank card standing on its edge, with a single long stitch line across it that has come undone in the middle, two thread ends hanging loose. A needle rests on the ground beside it, ready to re-stitch. The yellow accent fills the card's chip. The message: "Payment didn't go through. Nothing was charged — try again." It must look fixable, not alarming: no red, no warning symbols.

### 3.7 Sold out / back in stock — `sold-out.svg` **[added]**
> [Shared style.] A cardboard fabric bolt tube standing upright with only the last small curl of fabric left on it, and a small tag hanging from it on a string. The yellow accent fills a tiny bell drawn on the tag. It supports "Sold out — get a message when it's back." Gentle and hopeful.

### 3.8 Dashboard: no orders yet — `empty-orders.svg` **[added]**
> [Shared style.] A neat stack of three empty flat-folded parcel boxes beside a roll of packing tape, with a pen resting on top. The yellow accent fills the inner hole of the tape roll. For the owner's orders board before the first sale: "No orders yet. Share your shop link to get the first one."

### 3.9 Dashboard: no products yet — `empty-products.svg` **[added]**
> [Shared style.] An empty clothes rail with three bare wooden hangers, the middle one tilted slightly. A phone with a camera lens leans against the base of the rail. The yellow accent fills the phone's camera button. "Add your first product — it takes two minutes."

### 3.10 Dashboard: no alerts — `empty-alerts.svg` **[added]**
> [Shared style.] A pin cushion shaped like a tomato with three pins neatly lined up in it, next to a quiet bell lying on its side. The yellow accent fills the pin cushion. "All caught up."

### 3.11 Server error — `error.svg` **[added]**
> [Shared style.] A sewing machine seen from the side, with its thread tangled into a loose knot under the needle. The yellow accent fills the machine's hand wheel. "Something snagged on our side. Please try again in a minute."

---

## 4. Motifs, patterns and shapes

### 4.1 Needle and thread motif — `motif-needle-thread.svg`
**Spec:** SVG, `currentColor`, a horizontal strip 480 × 48 plus a square version 96 × 96.
> The logo's H crossbar is already a sewing needle, so this motif must use **the same needle**: copy the needle crossbar's exact shape from `harries-vogue-primary.svg` (its taper, point and elongated eye) instead of drawing a new one. Lay it horizontally at the left, with a long thread trailing from its eye. The thread runs right in a relaxed line that drops into five evenly spaced running stitches, short dashes that dip under an imaginary seam line, then rises and ends in a small loose loop. A 1.5 px stroke, round caps, `currentColor`. It's used as a section divider, under headings, and as the small accent in empty states, so it must read as "hand-finished", sit quietly next to text, and tile nowhere. Also deliver a square version: the needle diagonal, with the thread forming one loose loop around it. No yellow fill; the developer colours it with CSS.
>
> Avoid: a cartoon needle with a face, a thick thread, and a decorative swirl.

### 4.2 Fabrics pattern — `pattern-fabrics.svg`
**Spec:** a seamless SVG tile, 160 × 160, used at 4–8% opacity behind the Fabrics section and on the yellow packaging.
> Design a seamless repeat tile inspired by West African wax-print geometry, original and not copied from any existing Vlisco or ankara design. Use a grid of 4 × 4 cells; each cell has concentric half-circles rising from the bottom edge (three arcs), alternating direction cell to cell, so the arcs form a gentle woven rhythm. Every 3rd cell swaps its arcs for a solid 8 px dot. Line weight 2 px, single colour `currentColor`, flat, no fills except the dots. The tile must repeat with no visible seam, so check it as a 4 × 4 repeat before delivering. At low opacity it should feel like a printed fabric texture, not wallpaper.
>
> Avoid: copying a real ankara print (they're often trademarked designs), kente stereotypes, and more than one colour.

### 4.3 Lingerie pattern — `pattern-lingerie.svg`
**Spec:** a seamless SVG tile, 120 × 120, used at 6–10% opacity on dark lingerie backgrounds.
> Design a seamless repeat tile that reads like fine Chantilly lace seen from a distance: a hexagonal mesh net of 1 px lines (the lace ground), with a small original floral motif every other cell, made of a five-petal open flower outlined in a 1.5 px line with a scalloped edge. No fills. Single colour `currentColor`. Delicate, intimate and refined. It must repeat with no seam; test it as a 4 × 4 repeat.
>
> Avoid: dense detail that turns into grey noise at 8% opacity, roses that look like wallpaper, and hearts.

### 4.4 Ready-to-wear pattern — `pattern-rtw.svg`
**Spec:** a seamless SVG tile, 200 × 200, used at 4–6% opacity on editorial pages.
> Design a seamless tile drawn from a tailor's paper sewing pattern: thin 1 px dashed cut lines, small notch triangles, grain-line arrows (a straight line with an arrowhead at each end), and a few sparse dart shapes, arranged loosely so they look like a section of a real sewing-pattern sheet. Add tiny "1", "2", "3" piece numbers in a geometric sans at 8 px as outlined paths. Single colour `currentColor`. Editorial and architectural. It must tile with no visible seam.
>
> Avoid: real brand names or sizing systems printed on it, and any copyrighted pattern sheet.

### 4.5 Brand shapes for layered cut-outs — `shape-*.svg` **[added, Phase 3]**
**Why:** the plan calls for "cut-out products over brand shapes". The shapes must not be generic blobs.
> Design four solid flat shapes that her cut-out product photos will sit in front of, in Harries Yellow and in black. Each is derived from tailoring, not abstract blobs. (1) `shape-swatch.svg`: a tall rectangle at 4:5 ratio whose right and bottom edges are cut with pinking-shear zigzags (6 px teeth at 800 px tall), like a fabric swatch. (2) `shape-arch.svg`: a tall arch, a rectangle with a full semicircle top, like a boutique window or changing-room door. (3) `shape-tag.svg`: an oversized swing tag with a cut corner and a punched hole. (4) `shape-bolt.svg`: a horizontal band with one rolled end drawn as a spiral, like fabric unrolling from a bolt. Single flat fill, `currentColor`, a `viewBox` with no padding, crisp geometry, and no strokes. They should look deliberate and expensive behind a product, with the product always the hero.
>
> Avoid: wavy organic blobs, gradients, and drop shadows.

### 4.6 Measuring-tape divider — `divider-tape.svg` **[added]**
> A horizontal section divider 1200 × 24 px drawn as a flat tailor's tape measure seen from above: two long parallel lines 10 px apart, with tick marks every 8 px (a longer tick every 5th mark) and small outlined numbers every 10 ticks. Single colour `currentColor`, 1 px strokes. It must be cropped from either end without breaking, so keep no important detail at the edges. Used between home page sections and on the size guide.

---

## 5. Campaign and site photography — `assets/photography/campaign/`

**How to use these prompts:** each one is written as a full shoot brief for her or a photographer. The same text works in ChatGPT or Nano Banana to make a **mood board or a dev placeholder**. Final images must show her real products. If an AI image is used as a temporary placeholder, file it as `placeholder-<name>.jpg` so it can't ship by mistake.

**Technical spec for all of them:** shoot RAW, deliver JPG originals of at least 3000 px on the long edge, sRGB, with no filters and no colour grade that shifts fabric colour. Include a colour card in the first frame of each set.

### 5.1 Home hero: Fabrics — `hero-fabrics.jpg`
**Crop:** 16:9 desktop and 4:5 mobile from the same shot. Keep the subject inside the centre 4:5 area.
> A bright, colour-led still life of real fabrics from the shop. Eight to ten folded lengths of fabric — wax prints, guipure lace, sequinned lace, brocade — are stacked in a loose, slightly staggered tower on the right third of the frame, each fold showing a clean edge so the colours read as horizontal bands. One length of lace is pulled out of the stack and falls in a soft cascade to the floor, toward the camera, showing its texture. Background: a seamless off-white paper sweep near `#FAFAF7`. Light: large soft daylight from the left, a white bounce on the right, gentle shadows under each fold, true colours. Camera: 50 mm lens, f/8, at chest height, sharp from front to back. The left 40% of the frame is clean off-white space for a headline. Mood: abundant, joyful, premium, like walking into the best fabric shop in Lagos.
>
> Avoid: models, props, flowers, dramatic shadows, colour grading, and a crooked horizon.

### 5.2 Home hero: Lingerie — `hero-lingerie.jpg`
**Crop:** 16:9 and 4:5.
> An intimate, warm, dark editorial portrait. A Black woman in her late twenties with deep brown skin, natural short hair or a sleek low bun, sits sideways on the edge of an unmade bed with ivory linen sheets, wearing a real lingerie set from the shop: a lace bralette and matching briefs, with a sheer robe falling off one shoulder. She looks away from the camera toward a window, relaxed and self-possessed, with no posed smile. Tasteful and confident, never explicit. Her body is turned so the lace detail on the bralette is the brightest point in the frame. Light: a single warm window light from the right, late afternoon, falling off into deep shadow on the left; the background wall is a warm dark brown close to black. Camera: 85 mm, f/2, focus on the lace at the shoulder strap. The left third of the frame stays in deep shadow for the headline. Mood: private, warm, luxurious, self-love, not for the male gaze.
>
> Avoid: overly sexual poses, heavy retouching of skin texture, smoothing the lace, cold or blue light, and any visible brand that isn't hers.

### 5.3 Home hero: Ready-to-wear — `hero-rtw.jpg`
**Crop:** 16:9 and 4:5.
> A full-length editorial fashion portrait. A tall Black woman with dark skin, styled with a sculptural gele or clean natural hair, stands in a strong contrapposto pose, wearing a real ready-to-wear outfit from the shop: a structured, tailored piece with a defined waist. She looks straight into the camera with a calm, confident expression. Background: a flat seamless paper backdrop in solid `#0A0A0A`, with a soft key light from the front-left (large octabox) and a thin rim light from behind on the right outlining her silhouette. The garment's colour must be accurate, since it is the hero. Camera: 70 mm, f/5.6, at waist height so she looks powerful. She stands on the right third, with the left two-thirds empty dark space. Mood: Lagos Fashion Week campaign, sharp, modern, poised.
>
> Avoid: busy locations, motion blur, extreme fashion poses that hide the garment, and heavy skin smoothing.

### 5.4–5.6 Category tiles — `tile-fabrics.jpg`, `tile-lingerie.jpg`, `tile-rtw.jpg`
**Crop:** 4:5, at least 2000 × 2500 px. Shown side by side on the home page, so they must match each other.
> Three matching category tiles, shot in one session with the same camera height (chest level), lens (50 mm), distance and framing, so they sit together as a set. Each has a single hero item centred, filling 70% of the frame height, with off-white seamless background `#FAFAF7` and soft daylight from the left.
> - **Fabrics:** one length of lace draped over an invisible horizontal rod so it hangs in a long, elegant fall, the scalloped edge showing at the bottom.
> - **Lingerie:** one real lace bra laid flat at a slight angle on ivory silk, shot from directly above, with soft warm light. This is the one tile allowed to be a little warmer.
> - **Ready-to-wear:** one real garment on a plain wooden hanger hung against the wall, its shape filled out with tissue so it doesn't hang flat.
>
> Avoid: different backgrounds between the three, props, and text in the image.

### 5.7 Occasion story: Owambe — `occasion-owambe-01…06.jpg`
**Crop:** a mix of 4:5 portraits and 3:2 landscapes, six frames.
> A six-frame editorial story of a Yoruba owambe party, celebrating colour and togetherness. Three to five women of different ages (twenties to sixties), all wearing outfits made from her real fabrics in coordinated aso-ebi colours, with matching gele. The frames: (1) a wide group shot under a decorated party canopy, laughing mid-conversation; (2) a close-up of hands adjusting a gele, showing the fabric's sheen; (3) a full-length single portrait of the most striking outfit; (4) a detail of lace texture at the sleeve, catching light; (5) two friends dancing, with slight motion in the fabric but sharp faces; (6) the wrapper and blouse fabric folded on a chair, shot for the "shop the look" callout. Light: golden late afternoon, natural, warm but not orange; fill the faces with a reflector. Camera: 35 mm for the wide shots, 85 mm for the portraits. Feel: real, joyful and Lagos, not staged stock photography. Each frame must show at least one fabric clearly enough to tag with a callout.
>
> Avoid: cheesy posed smiles at camera in every frame, overexposed white skies, colour grading that shifts the fabric, and other brands' logos.

### 5.8 Occasion story: Wedding — `occasion-wedding-01…06.jpg`
> A six-frame story of a Nigerian traditional wedding, focusing on the bride and her family's fabrics. The frames: (1) the bride in a full outfit of her real premium lace with a matching gele, seated and regal, framed by a doorway; (2) a macro of beading or sequins on the lace, catching soft light; (3) the bride's mother adjusting her gele, showing tenderness; (4) a row of the bridal party standing in matching aso-ebi, full length; (5) the bride's hands holding a hand fan, with the lace sleeve in sharp focus; (6) the fabric laid out on a bed before dressing, folded with the gele, as a flat lay for "shop the look". Light: soft and bright, ivory and gold tones, glowing skin. Camera: 50 and 85 mm, shallow depth of field for the portraits. Feel: answers "Is this lace good enough for my wedding?" with a confident yes.
>
> Avoid: Western white-wedding clichés, heavy vignettes, and plastic-looking skin.

### 5.9 Occasion story: Everyday — `occasion-everyday-01…06.jpg`
> A six-frame story of everyday Lagos style with her ready-to-wear pieces. One woman in her thirties through a working day. The frames: (1) stepping out of a front gate in a smart RTW outfit in morning light; (2) crossing a busy street in Ikeja or Lekki with the city soft in the background; (3) at a café table with a laptop, as a medium shot showing the outfit's cut; (4) a detail of fabric at the hem as she walks; (5) a quieter evening shot at home with the jacket off, wearing the comfortable lingerie basics under a loose shirt (tasteful); (6) the outfit laid flat for "shop the look". Light: natural, honest, a slight warm tone, no flash. Camera: 35 mm, documentary feel. Feel: aspirational but real.
>
> Avoid: staged corporate stock looks, crowds of identifiable strangers (get releases or blur them), and visible trademarks.

### 5.10 Macro texture set — `macro-<slug>-wide.jpg` and `macro-<slug>-detail.jpg`
**Why:** the plan's "texture as content" scroll zoom goes from the full garment to a macro of the lace. It needs matched pairs.
> For each hero product, shoot a matched pair from exactly the same camera position on a tripod. (A) **Wide:** the full garment or fabric fall, filling the frame, on off-white. (B) **Detail:** without moving the tripod, switch to a 100 mm macro lens (or move closer along the same axis) and focus on one textile detail exactly at the centre of frame A — a lace motif, a sequin cluster, a woven edge, a single embroidered flower — so the website can zoom from A into B. Light the detail with a low, raking side light at about 20° to bring out the 3D relief of thread and beads, with a white bounce on the other side so shadows stay readable. f/11 for depth, focus-stacked if needed, sharp from front thread to back. Record the exact centre point used. Colour-card frame first. No AI sharpening and no texture enhancement afterward: this image is the proof of quality.
>
> Avoid: moving the tripod between A and B, coloured light, and any "detail" or "clarity" sliders in editing.

### 5.11 Shop photo — `about-shop.jpg` **[added]**
**Why:** "Her shop in Abule Egba" is a real place and builds trust with first-time buyers.
> A wide, honest photograph of the shop in Abule Egba, taken from the doorway on a bright morning with the lights on. Shelves of folded fabrics in neat colour order fill the walls, a cutting table with a measuring stick is in the foreground, and the owner (if willing) stands behind the counter, mid-task, folding a length of fabric. Natural light from the door plus the shop lights; expose for the fabrics so their colours are true. 24 mm lens at chest height, verticals kept straight. Tidy the space but don't stage it. It should feel like "a real shop you can visit". 3:2 landscape, plus a 4:5 crop.
>
> Avoid: wide-angle distortion, empty shelves, and clutter in the foreground.

### 5.12 Founder portrait — `about-founder.jpg` **[added]**
> A warm, confident portrait of the owner for the About page and trust sections. She stands at the cutting table with a tape measure around her neck, holding a length of her favourite fabric, looking at the camera with a calm, proud expression. Window light from one side, a plain dark background (the shop wall or a black cloth), 85 mm, f/2.8, framed from the waist up. Real skin texture with light retouching only. 4:5 crop, plus a square crop for the dashboard avatar.
>
> Avoid: corporate headshot lighting, heavy makeup retouching, and a busy background.

### 5.13 Packaging and delivery photo — `trust-packaging.jpg` **[added]**
**Why:** "Will it arrive safely and look good?" is a trust question shoppers ask before paying.
> A clean overhead photo of an order being packed: a fabric length neatly folded and tied, a lingerie set wrapped in tissue, the yellow Harries Vogue shopping bag or box, a printed order slip, and a strip of brand sticker, arranged on a black surface with off-white tissue paper spilling out. Soft, even overhead light, 50 mm, shot straight down, f/8. 4:5 crop. Only use the real packaging; if it isn't printed yet (pending the trademark check), shoot plain packaging and leave this until later.

---

## 6. Product photography — `assets/photography/products/<line>/<product-slug>/`

The plan sets the spec: off-white backdrop, 4:5 ratio, at least 2000 px on the long edge, and per product a front shot, a drape or on-body shot, and a macro texture shot. A colour card goes in the first frame of each session.

### 6.1 Shoot brief for her — print and pin this up in the shop

> **Set-up (do once per session):** Hang a seamless off-white paper roll or a large white sheet with no wrinkles, curving from the wall onto the table or floor so there's no corner line. Shoot by a large window with indirect daylight (no direct sun on the fabric), between 10 am and 3 pm. Put a white foam board opposite the window to soften shadows. Turn off the room's coloured lights. Use the phone's main camera (1×, not ultra-wide), set to the highest resolution, with HDR off and no beauty or filter modes. Lock focus and exposure by long-pressing on the fabric. Hold the camera level, or better, use a cheap phone tripod. In the first photo of the session, hold the colour card next to the fabric.
>
> **For every product, take these shots (portrait, 4:5):**
> 1. `01.jpg` — **Front:** for fabric, fold the length into a neat rectangle with the best side facing up, shot straight down from above, filling 80% of the frame. For lingerie, lay it flat and symmetrical or put it on a bust form. For RTW, put it on a dress form or hanger, front view, centred.
> 2. `02.jpg` — **Drape or on-body:** for fabric, drape it over the edge of the table or a rod so it falls in natural folds that show how it moves and catches light. For lingerie and RTW, on a model or dress form from a three-quarter angle.
> 3. `03.jpg` — **Macro texture:** get close enough that one lace motif, sequin cluster or weave pattern fills the frame. Tap to focus on it. Light from the side to show depth. This is the "is it good quality?" photo.
> 4. `04.jpg` (optional) — **Scale:** the fabric held up against a person or a tape measure, so shoppers see how big the pattern is.
> 5. `05.jpg` (optional) — **Back** for lingerie and RTW.
>
> **Check before moving on:** zoom in on the photo. Is the texture sharp? Does the colour on the phone screen match the real fabric in your hand, next to the window? If not, reshoot.

### 6.2 AI edit prompt: clean background (ChatGPT or Nano Banana, attach her photo)

> Edit the attached product photograph. **Only** replace the background with a smooth, seamless, evenly lit off-white studio background of exact colour `#FAFAF7`, with a soft, natural contact shadow under the product that matches the existing light direction. Remove any wrinkles, tape, dust, floor seams and stray threads on the background only.
> **Do not change the product in any way.** Keep the fabric's exact colours, hue, saturation and brightness; its exact pattern, print, lace motifs, sequins, beads, weave and thread texture; its shape, folds and drape; and its edges, including scalloped lace edges and loose threads that belong to the fabric. Do not sharpen, smooth, recolour, add, remove or "improve" any part of the product. Do not invent detail. Keep the original framing at 4:5 and the original resolution or higher.
> If any part of the product would have to change to complete the edit, stop and leave that area as it was.

### 6.3 AI edit prompt: lighting fix

> Correct the lighting of the attached product photograph so it looks like it was shot with soft, even studio daylight: lift the shadows gently, recover any blown highlights, and remove the yellow or blue cast **from the background only**, using the colour card in the reference photo (if attached) or the off-white backdrop as the neutral reference. Keep the product's true colours exactly as they appear when neutral: do not saturate, do not shift hue, do not add contrast to the fabric, do not change the texture. No vignettes, no glow, no filters. Output at the same 4:5 crop and the same or higher resolution.

### 6.4 AI edit prompt: upscale

> Upscale the attached product photo to at least 2000 px on the long edge (4000 px if possible) for an e-commerce zoom view. Preserve the real texture exactly: every lace thread, every sequin, every weave line must stay the same shape and position. Do not hallucinate new detail, do not smooth fabric, do not add sharpening halos. If a region is too blurry to upscale faithfully, leave it soft rather than inventing detail. Keep colours identical to the original.

### 6.5 AI edit prompt: cut-out for layered layouts (Phase 3)

> Cut out the product in the attached photo and place it on a fully transparent background, exported as PNG. Follow the true edge of the product exactly, including lace scallops, fringe, loose threads, sheer areas (keep sheer fabric partly transparent, as in reality) and the gaps between straps. Do not change any colour, pattern or texture inside the product. Do not add a shadow. Output at the original resolution.

**After every AI edit:** put the edited file next to the original (`01.jpg` stays; the edit is `01-edit.jpg`), compare the two side by side at 100%, and reject the edit if any colour or texture changed.

---

## 7. Explainer graphics — `assets/illustrations/`

These answer the questions customers ask most in DMs. Confirm the numbers with her before Malik draws them; don't publish guessed measurements.

### 7.1 "How many yards do I need?" — `guide-yards.svg` **[added]**
> [Shared illustration style from section 3, but at 960 × 600 px and with up to two yellow accents.] An infographic row of four simple line-drawn figures (no faces), each wearing a classic Nigerian outfit, with the yardage written under each in Poppins SemiBold as outlined paths: (1) a blouse and wrapper — "[TBC] yards"; (2) a long gown — "[TBC] yards"; (3) a men's agbada set — "[TBC] yards"; (4) a gele and ipele — "[TBC] yards". Above each figure, a small folded-fabric icon stacked with the number of yards as layers. Under the row, a thin tape-measure line with "1 yard ≈ 91 cm" marked. Clean, scannable on a phone: also deliver a vertical 600 × 1200 version with the four figures stacked in a 2 × 2 grid. The numbers stay as `[TBC]` until she confirms them.
>
> Avoid: realistic body proportions that exclude bigger bodies; draw a mix of body shapes.

### 7.2 Lingerie measuring guide — `guide-lingerie-measure.svg` (Phase 3)
> [Shared illustration style, at 600 × 800.] A simple, respectful front-view line drawing of a female torso from shoulders to hips, with no face or nipples, in a neutral pose with arms slightly away from the body. Three measurement lines in Harries Yellow with small numbered circles: (1) **Underbust** — a tape measure drawn snugly around the ribcage directly under the bust; (2) **Bust** — around the fullest part of the bust, level all round; (3) **Hips** — around the fullest part of the hips. Each line is a dashed tape with an arrowhead at each end. A short instruction sits beside each number, as separate text in the HTML, not baked into the SVG. Draw a curvier, fuller body than typical fashion croquis, so most of her customers see themselves.
>
> Avoid: sexualised poses, a thin fashion-sketch body, and text inside the SVG.

### 7.3 Ready-to-wear measuring guide — `guide-rtw-measure.svg` **[added, Phase 3]**
> [Shared illustration style, at 600 × 900.] A full-length front-view line drawing of a female figure in a plain fitted slip, no face. Five measurement lines in Harries Yellow with numbered circles: (1) bust, (2) waist at the narrowest point, (3) hips at the fullest point, (4) shoulder to shoulder across the back (shown as a line across the top of the shoulders), (5) full length from shoulder to hem. Each is a dashed tape with arrowheads. Labels go in the HTML, not in the SVG. Mid-size, realistic body.

### 7.4 Fabric width diagram — `guide-fabric-width.svg` **[added]**
> [Shared illustration style, at 800 × 400.] A length of fabric shown unrolled flat from a bolt on the left, seen from above. A horizontal yellow dimension line across the length is labelled "Length: sold by the yard", and a vertical dimension line across the width is labelled "Width: [TBC] inches / [TBC] cm" (labels in the HTML). The selvedge edges are drawn as a thin solid band on each long side, with a small callout naming "selvedge". It answers "how wide is it?" at a glance.

---

## 8. Video — `assets/video/` (Phase 3)

**Spec for all:** 4K or at least 1080p source, delivered as H.264 MP4 and WebM (VP9), no audio track for loops, under 3 MB per loop on mobile (the developer will encode), seamless loop, 6–10 seconds. Always provide a still poster frame JPG of the first frame. Shot with her real products only.

### 8.1 Hero loop: Fabrics — `hero-fabrics.mp4`
> A slow, seamless 8-second loop. Locked-off camera on a tripod, 50 mm, framed like hero image 5.1. A length of lace is pulled very slowly off the top of a stacked fabric tower by an off-screen hand (or a hidden fishing line), and slides down in a gentle cascade toward the camera, rippling and catching light. Shoot at 60 fps to slow down to 30 fps. Soft daylight from the left, off-white background, true colours. The final frame must match the first frame closely for a seamless loop: reset the fabric and keep the best take, or play it forwards then backwards. Keep the left 40% of the frame clean for text.
>
> Avoid: camera movement, cuts, hands in frame, and colour grading.

### 8.2 Hero loop: Lingerie — `hero-lingerie.mp4`
> An intimate 8-second loop, matching hero image 5.2. Locked-off camera, 85 mm. A sheer robe or the edge of a lace piece moves very gently in a soft breeze from a fan off-camera, while window light flickers slightly as if through a moving curtain. The model, if present, breathes naturally and barely moves; the motion is in the fabric. Warm, dark, quiet. Must loop seamlessly.
>
> Avoid: dramatic movement, wind that looks artificial, and anything explicit.

### 8.3 Hero loop: Ready-to-wear — `hero-rtw.mp4`
> An 8-second loop matching hero image 5.3. Black seamless background, the model walks two slow steps toward the camera, pauses and turns her shoulders a quarter turn, so the garment's tailoring and movement show. Locked-off camera, 70 mm, 60 fps slowed to 30. Rim light outlining the silhouette. Loop by cutting at matching poses.
>
> Avoid: runway music-video style cuts and handheld shake.

### 8.4 Macro clip for product pages — `macro-<slug>.mp4`
> A 6-second macro clip of one hero fabric for its product page. 100 mm macro lens on a slider, moving very slowly (about 2 cm over 6 seconds) across a lace motif or a sequin panel, with a low raking side light so threads and sequins cast tiny shadows and sparkle as the angle changes. f/8, sharp. No grading. This is the moving version of the macro photo: proof of quality.

**Remotion campaign videos** are built in code from her photos and clips, so they don't need separate assets beyond the photos above, the logo SVGs and the fonts.

---

## 9. Fonts — `assets/fonts/` (download, no prompt needed)

| Font | Weights | Source | Notes |
| --- | --- | --- | --- |
| Satoshi | Bold (700), Black (900) | fontshare.com — free for commercial use | Download the woff2 files; Claude Code subsets them to Latin plus ₦ (U+20A6). |
| Poppins | Regular (400), Medium (500), SemiBold (600) | Google Fonts (OFL) | Download from the GitHub release, not via a runtime Google Fonts link. Check the ₦ sign renders. |
| Plus Jakarta Sans | Medium (500), tabular figures | Google Fonts (OFL) | Fallback for dashboard number cells only, if Poppins figures don't align. |

---

## 10. What Claude Code creates

- `placeholder-<name>.svg`: neutral grey rectangles at the right aspect ratio with the asset name in small text, for every item above until the real file arrives.
- `ASSETS_TODO.md`: the live checklist of missing assets.
- Print stylesheets and email templates that reference the files above.

## Questions for Malik and her before production

1. Wishlist: yes or no? It decides whether `heart.svg` is needed.
2. Yardage per outfit (guide 7.1) and fabric widths (guide 7.4): she supplies the real numbers.
3. Which 3–5 products are the hero products for the macro set and the hero loops?
4. Will real models be available for lingerie and ready-to-wear, and are signed model releases in place?
5. Has the trademark check on "Harries Vogue" come back? Packaging photos (5.13) and share images (1.10, 1.11) wait for it.
