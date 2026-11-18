import type { ProductImage } from "@hv/core";
import { cx } from "@hv/ui";
import placeholder from "@hv/ui/illustrations/placeholder-product.svg?url";
import { IMAGE_BASE } from "../lib/config";

/** Product photo thumbnail: AVIF, then WebP, from the 400 px size; the grey placeholder until photos exist. */
export function Thumb({ image, size = 48, className }: { image: ProductImage | undefined; size?: number; className?: string }) {
  const box = cx("flex-none overflow-hidden rounded-[6px] bg-raised object-cover", className);
  const h = Math.round(size * 1.25);
  const standinBase = import.meta.env.VITE_STANDIN_BASE as string | undefined;
  if (image?.key.startsWith("standin/") && standinBase) {
    const src = `${standinBase}/${image.key.slice("standin/".length)}/400.webp`;
    return <img src={src} alt="" width={size} height={h} loading="lazy" className={box} style={{ width: size, height: h }} />;
  }
  if (!image || image.key.startsWith("placeholder/") || image.key.startsWith("standin/")) {
    return <img src={placeholder} alt="" width={size} height={h} className={box} style={{ width: size, height: h }} />;
  }
  const base = `${IMAGE_BASE}/${image.key}`;
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={`${base}/400.avif 400w`} sizes={`${size}px`} />
      <img src={`${base}/400.webp`} srcSet={`${base}/400.webp 400w`} sizes={`${size}px`} alt="" width={size} height={h} loading="lazy" className={box} style={{ width: size, height: h }} />
    </picture>
  );
}
