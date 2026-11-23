/// <reference lib="webworker" />
/**
 * Resizes one photo to the four agreed widths and encodes each as AVIF and WebP
 * (PLAN.md: 400/800/1200/2000, AVIF + WebP). Runs off the main thread so the form
 * stays responsive on her phone. The browser's own encoder is used when it has one;
 * otherwise the WebAssembly encoders load on first use. WebP is made first and reported on its
 * own: AVIF is slow and memory-hungry on phones, and if it fails the photo still saves as WebP.
 */

import { IMAGE_HEADER_BYTES, looksLike } from "@hv/core/image-format";

export const WIDTHS = [400, 800, 1200, 2000] as const;

export interface Request {
  bitmap: ImageBitmap;
}

export type Message =
  | { kind: "progress"; done: number; total: number }
  | { kind: "webp"; width: number; height: number; files: { name: string; blob: Blob }[] }
  | { kind: "done"; width: number; height: number; files: { name: string; blob: Blob }[] }
  | { kind: "error"; message: string };

const post = (m: Message) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

/** Halving steps keep fine fabric texture sharp; a single big downscale blurs it. */
function scaled(src: ImageBitmap | OffscreenCanvas, width: number): OffscreenCanvas {
  let current: ImageBitmap | OffscreenCanvas = src;
  while (current.width / 2 >= width) {
    const half = new OffscreenCanvas(Math.round(current.width / 2), Math.round(current.height / 2));
    const ctx = half.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
  }
  const out = new OffscreenCanvas(width, Math.round((current.height * width) / current.width));
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, out.width, out.height);
  return out;
}

async function native(canvas: OffscreenCanvas, ext: "avif" | "webp", quality: number): Promise<Blob | null> {
  const type = `image/${ext}`;
  try {
    const blob = await canvas.convertToBlob({ type, quality });
    if (blob.type !== type) return null; // unsupported types silently come back as PNG
    // Some browsers label the result correctly but write another format; use our encoder then.
    const head = new Uint8Array(await blob.slice(0, IMAGE_HEADER_BYTES).arrayBuffer());
    return looksLike(ext, head) ? blob : null;
  } catch {
    return null;
  }
}

const pixels = (c: OffscreenCanvas) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height);

async function webp(c: OffscreenCanvas): Promise<Blob> {
  const own = await native(c, "webp", 0.82);
  if (own) return own;
  const { default: encode } = await import("@jsquash/webp/encode");
  return new Blob([await encode(pixels(c), { quality: 82 })], { type: "image/webp" });
}

async function avif(c: OffscreenCanvas): Promise<Blob> {
  const own = await native(c, "avif", 0.6);
  if (own) return own;
  const { default: encode } = await import("@jsquash/avif/encode");
  // speed 8 keeps a 2000 px photo to a few seconds on a mid-range phone.
  return new Blob([await encode(pixels(c), { quality: 55, speed: 8 })], { type: "image/avif" });
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const { bitmap } = e.data;
  try {
    const total = WIDTHS.length * 2;
    let done = 0;
    const webps: { name: string; blob: Blob }[] = [];
    const canvases: [number, OffscreenCanvas][] = [];
    let previous: OffscreenCanvas | ImageBitmap = bitmap;
    // Largest first, each size drawn from the one above it.
    for (const w of [...WIDTHS].reverse()) {
      const canvas = scaled(previous, Math.min(w, bitmap.width));
      previous = canvas;
      canvases.push([w, canvas]);
      webps.push({ name: `${w}.webp`, blob: await webp(canvas) });
      post({ kind: "progress", done: ++done, total });
    }
    const width = Math.min(2000, bitmap.width);
    const height = Math.round((bitmap.height * width) / bitmap.width);
    post({ kind: "webp", width, height, files: webps });

    const avifs: { name: string; blob: Blob }[] = [];
    for (const [w, canvas] of canvases) {
      avifs.push({ name: `${w}.avif`, blob: await avif(canvas) });
      post({ kind: "progress", done: ++done, total });
    }
    post({ kind: "done", width, height, files: [...webps, ...avifs] });
  } catch (err) {
    post({ kind: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    bitmap.close();
  }
};
