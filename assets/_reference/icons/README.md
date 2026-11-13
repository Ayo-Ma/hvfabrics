# Premium Fashion & Fabrics — SVG Icon Library

58 icons, consolidated from batches 01–06.

## Folder structure
- icons/ — all 58 individual icons, named by their function
- overview/master-gallery.svg and .png — full visual catalog
- overview/size-contrast-overview.svg and .png — all icons at 16, 24, 32 px in black on white and white on black
- batches/ — original per-batch overview sheets

## Usage
SVGs have `viewBox="0 0 24 24"` and use `currentColor`.
For HTML, use inline SVG (or import it as a React component via an SVG loader) to inherit CSS color.
If using an <img src="..."> element, `currentColor` normally resolves inside the SVG rather than inheriting the CSS text color of the parent; use CSS filters, inline SVG or a mask when dynamic theming is needed.

Example CSS (inline SVG):
.icon { width: 24px; height: 24px; color: #151515; }
.icon--small { width: 16px; height: 16px; }
.dark .icon { color: #ffffff; }

Most custom icons use 1.5 px strokes with round caps and joins. Filled variants and the three social glyphs are exceptions.

Social brand glyphs should be reviewed against current official brand requirements before public launch.
Icon artwork preserves the delivered batches; this consolidation is not a redesign or a detailed optical quality audit of each shape.
