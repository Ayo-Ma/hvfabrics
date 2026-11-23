/** How many leading bytes `looksLike` needs to see. */
export const IMAGE_HEADER_BYTES = 256;

/**
 * Checks a file really is what its name says. WebP is RIFF….WEBP. AVIF is an ISO-BMFF "ftyp" box
 * naming an AVIF brand, either as its major brand or (as some encoders write it) a compatible one.
 */
export function looksLike(ext: "avif" | "webp", bytes: Uint8Array): boolean {
  if (bytes.length <= 12) return false;
  const ascii = (from: number) => String.fromCharCode(...bytes.subarray(from, from + 4));
  if (ext === "webp") return ascii(0) === "RIFF" && ascii(8) === "WEBP";
  if (ascii(4) !== "ftyp") return false;

  const boxSize = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  if (boxSize < 16) return false;
  const end = Math.min(boxSize, bytes.length, IMAGE_HEADER_BYTES);
  const isAvif = (brand: string) => brand === "avif" || brand === "avis";
  if (isAvif(ascii(8))) return true;
  // Offset 12 is the minor version; compatible brands follow it.
  for (let at = 16; at + 4 <= end; at += 4) if (isAvif(ascii(at))) return true;
  return false;
}
