import type { ProductImage } from "@hv/core";
import { api } from "../api";
import type { Message } from "./worker";

const MAX_INPUT_BYTES = 40 * 1024 * 1024;
/** If AVIF hasn't finished this long after WebP, the photo saves as WebP only. */
const AVIF_PATIENCE_MS = 45_000;
const PHOTO_NAME = /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i;
const HEIC_NAME = /\.(heic|heif)$/i;

/** Open the photo; an <img> is the fallback for formats only the browser's image loader reads (HEIC on iPhone). */
async function open(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export interface PhotoProgress {
  stage: "reading" | "resizing" | "uploading";
  /** 0–1 */
  share: number;
}

/**
 * From the file she picked to a stored product photo: decode (turned upright from the
 * camera's orientation), resize and encode in a worker, upload the eight files, return the
 * image record the product keeps. Alt text is filled in by the form.
 */
export async function addPhoto(file: File, onProgress: (p: PhotoProgress) => void): Promise<Omit<ProductImage, "alt">> {
  // Some systems give iPhone photos no file type, so the name counts too.
  if (!file.type.startsWith("image/") && !PHOTO_NAME.test(file.name)) throw new Error("That file isn't a photo. Use JPG, PNG, WebP, AVIF or HEIC.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is over 40 MB. Choose a smaller one.");
  onProgress({ stage: "reading", share: 0 });

  let bitmap: ImageBitmap;
  try {
    bitmap = await open(file);
  } catch {
    throw new Error(
      HEIC_NAME.test(file.name) || /hei[cf]/i.test(file.type)
        ? "This browser can't open iPhone (HEIC) photos. Add it from the iPhone, or save it as JPG first."
        : "This device can't open that photo. Save it as JPG or PNG and try again.",
    );
  }
  if (bitmap.width < 400) {
    bitmap.close();
    throw new Error("That photo is too small. Use one at least 2000 pixels wide.");
  }

  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  type Encoded = { width: number; height: number; files: { name: string; blob: Blob }[]; webpOnly: boolean };
  let patience: number | undefined;
  const result = await new Promise<Encoded>((resolve, reject) => {
    let webpReady: Encoded | null = null;
    // AVIF failed or ran out of time: WebP alone is a complete, good photo.
    const failed = (message: string) => (webpReady ? resolve(webpReady) : reject(new Error(`Couldn't resize the photo: ${message}`)));
    worker.onmessage = (e: MessageEvent<Message>) => {
      const m = e.data;
      if (m.kind === "progress") onProgress({ stage: "resizing", share: (m.done / m.total) * 0.7 });
      else if (m.kind === "webp") {
        webpReady = { width: m.width, height: m.height, files: m.files, webpOnly: true };
        patience = window.setTimeout(() => failed("timed out"), AVIF_PATIENCE_MS);
      } else if (m.kind === "done") resolve({ width: m.width, height: m.height, files: m.files, webpOnly: false });
      else failed(m.message);
    };
    worker.onerror = (e) => failed(e.message);
    worker.postMessage({ bitmap }, [bitmap]);
  }).finally(() => {
    window.clearTimeout(patience);
    worker.terminate();
  });

  const id = crypto.randomUUID();
  let sent = 0;
  // Two at a time: fast on Wi-Fi, gentle on a weak mobile signal.
  const queue = [...result.files];
  const next = async (): Promise<void> => {
    const f = queue.shift();
    if (!f) return;
    await api(`/admin/images/${id}/${f.name}`, { method: "PUT", raw: f.blob, contentType: f.blob.type });
    onProgress({ stage: "uploading", share: 0.7 + (++sent / result.files.length) * 0.3 });
    return next();
  };
  await Promise.all([next(), next()]);
  return { key: `products/${id}`, width: result.width, height: result.height, ...(result.webpOnly ? { avif: false as const } : {}) };
}
