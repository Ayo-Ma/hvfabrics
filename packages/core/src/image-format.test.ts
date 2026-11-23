import { describe, expect, it } from "vitest";
import { looksLike } from "./image-format";

const ftyp = (major: string, ...compatible: string[]) => {
  const text = `${major}\0\0\0\0${compatible.join("")}`;
  const size = 8 + text.length;
  return new Uint8Array([0, 0, 0, size, ...new TextEncoder().encode(`ftyp${text}`), 1, 2, 3, 4]);
};

describe("looksLike", () => {
  it("accepts AVIF named as the major brand", () => {
    expect(looksLike("avif", ftyp("avif", "mif1", "miaf"))).toBe(true);
    expect(looksLike("avif", ftyp("avis", "msf1"))).toBe(true);
  });

  it("accepts AVIF named only as a compatible brand", () => {
    expect(looksLike("avif", ftyp("mif1", "miaf", "avif"))).toBe(true);
  });

  it("rejects other ISO files, junk and brands past the end of the box", () => {
    expect(looksLike("avif", ftyp("heic", "mif1", "heic"))).toBe(false);
    expect(looksLike("avif", new Uint8Array(32))).toBe(false);
    const outside = ftyp("mif1", "miaf");
    const padded = new Uint8Array([...outside.subarray(0, outside.length - 4), ...new TextEncoder().encode("avif")]);
    expect(looksLike("avif", padded)).toBe(false);
  });

  it("checks WebP", () => {
    const enc = (x: string) => [...new TextEncoder().encode(x)];
    expect(looksLike("webp", new Uint8Array([...enc("RIFF"), 0, 0, 0, 0, ...enc("WEBPVP8 "), 1]))).toBe(true);
    expect(looksLike("webp", ftyp("avif"))).toBe(false);
  });
});
