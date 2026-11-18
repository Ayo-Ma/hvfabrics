import { cx } from "@hv/ui";
import media from "~/lib/media.json";

/**
 * Campaign and editorial photographs (assets/photography → `corepack pnpm images` →
 * public/media). Serves AVIF then WebP at the widths that exist, with the real width and height.
 * Until a photograph has been generated for a slot, it renders a quiet field of the same shape,
 * so layouts can be judged and nothing shifts when the picture arrives.
 */

type Entry = { width: number; height: number; widths: number[] };
const MANIFEST = media as Record<string, Entry>;

export function hasMedia(slot: string): boolean {
  return slot in MANIFEST;
}

export function Media({
  slot,
  alt,
  sizes,
  priority = false,
  ratio,
  tone = "light",
  className,
  imgClassName,
}: {
  /** e.g. "campaign/stage-01-hero" (path under assets/photography without the extension) */
  slot: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Fallback aspect ratio for the empty field, e.g. "4 / 5". */
  ratio: string;
  tone?: "light" | "dark";
  className?: string;
  imgClassName?: string;
}) {
  const entry = MANIFEST[slot];
  if (!entry) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cx(tone === "dark" ? "bg-grey-800" : "bg-grey-100", className)}
        style={{ aspectRatio: ratio }}
      />
    );
  }
  const base = `/media/${slot}`;
  const set = (ext: string) => entry.widths.map((w) => `${base}/${w}.${ext} ${w}w`).join(", ");
  const fallbackWidth = entry.widths.includes(800) ? 800 : entry.widths[entry.widths.length - 1]!;
  return (
    <picture className={cx("block", className)}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`${base}/${fallbackWidth}.webp`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={cx("block size-full object-cover", imgClassName)}
      />
    </picture>
  );
}
