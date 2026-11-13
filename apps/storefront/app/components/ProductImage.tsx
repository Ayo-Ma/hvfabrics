import type { ProductImage as Img } from "@hv/core";
import { useRouteLoaderData } from "react-router";
import { resolveImage } from "~/lib/images";

/** <picture> with AVIF + WebP srcsets, fixed width/height (no layout shift) and alt text. */
export function ProductImage({
  image,
  sizes,
  priority = false,
  className,
}: {
  image: Img;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const root = useRouteLoaderData("root") as { imageBase: string } | undefined;
  const r = resolveImage(image, root?.imageBase ?? "");
  return (
    <picture>
      {r.sources.map((s) => (
        <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={sizes} />
      ))}
      <img
        src={r.src}
        alt={r.alt}
        width={r.width}
        height={r.height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
      />
    </picture>
  );
}
