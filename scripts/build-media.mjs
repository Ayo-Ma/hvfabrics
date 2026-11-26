/* global console, process */
// Turns the photographs in assets/photography/ (campaign, banners, product stand-ins) into the web
// sizes the storefront loads: 400 / 800 / 1200 / 2000 px wide, AVIF + WebP, never upscaled.
// Writes apps/storefront/public/media/<group>/<name>/<width>.<avif|webp> and a manifest with each
// image's real size (apps/storefront/app/lib/media.json) so every <img> gets width and height.
// Run: corepack pnpm images   (after adding or replacing photographs)
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "assets", "photography");
const OUT = join(root, "apps", "storefront", "public", "media");
const MANIFEST = join(root, "apps", "storefront", "app", "lib", "media.json");
const WIDTHS = [400, 800, 1200, 2000];
const GROUPS = ["home", "campaign", "banners", "products"];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const manifest = {};
let made = 0;
for (const group of GROUPS) {
  for (const file of walk(join(SRC, group))) {
    if (!/\.(jpe?g|png|webp|tiff?)$/i.test(file) || /-alt\d+\./.test(file)) continue;
    const key = relative(SRC, file).split(sep).join("/").replace(extname(file), "");
    const img = sharp(file).rotate();
    const { width = 0, height = 0 } = await img.metadata();
    const outDir = join(OUT, ...key.split("/"));
    mkdirSync(outDir, { recursive: true });
    const widths = WIDTHS.filter((w) => w <= width);
    if (widths.length === 0) widths.push(width); // small source: one size, never enlarged
    for (const w of widths) {
      const resized = sharp(file).rotate().resize({ width: w, withoutEnlargement: true });
      await resized.clone().avif({ quality: 52, effort: 6 }).toFile(join(outDir, `${w}.avif`));
      await resized.clone().webp({ quality: 80 }).toFile(join(outDir, `${w}.webp`));
      made += 2;
    }
    manifest[key] = { width, height, widths };
    console.log(`${key}  ${width}×${height}  → ${widths.join(", ")}`);
  }
}
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${Object.keys(manifest).length} photographs, ${made} files written. Manifest: ${relative(root, MANIFEST)}`);
if (Object.keys(manifest).length === 0) console.log(`No photographs found in ${basename(SRC)}/ yet (see assets/GENERATION_PROMPTS.md).`);
process.exit(0);
