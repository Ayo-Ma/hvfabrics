import type { ProductImage } from "@hv/core";
import { api } from "../api";
import type { Message } from "./worker";

const MAX_INPUT_BYTES = 40 * 1024 * 1024;

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
  if (!file.type.startsWith("image/")) throw new Error("That file isn't a photo.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is over 40 MB. Choose a smaller one.");
  onProgress({ stage: "reading", share: 0 });

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This phone can't open that photo format. Try a JPEG.");
  }
  if (bitmap.width < 400) {
    bitmap.close();
    throw new Error("That photo is too small. Use one at least 2000 pixels wide.");
  }

  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const result = await new Promise<Extract<Message, { kind: "done" }>>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<Message>) => {
      const m = e.data;
      if (m.kind === "progress") onProgress({ stage: "resizing", share: (m.done / m.total) * 0.7 });
      else if (m.kind === "done") resolve(m);
      else reject(new Error(`Couldn't resize the photo: ${m.message}`));
    };
    worker.onerror = (e) => reject(new Error(`Couldn't resize the photo: ${e.message}`));
    worker.postMessage({ bitmap }, [bitmap]);
  }).finally(() => worker.terminate());

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
  return { key: `products/${id}`, width: result.width, height: result.height };
}
