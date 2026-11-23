import { Link } from "react-router";
import { formatMoney, unitLabel, type CatalogueProduct } from "@hv/core";
import { cx } from "@hv/ui";
import { ProductImage } from "./ProductImage";

export function StockTag({ product }: { product: CatalogueProduct }) {
  if (product.soldOut) {
    return <span className="bg-ink px-2 py-1 text-[13px] font-medium text-paper">Sold out</span>;
  }
  return null;
}

export function ProductCard({
  product,
  tone = "light",
  priority = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: {
  product: CatalogueProduct;
  tone?: "light" | "dark";
  priority?: boolean;
  sizes?: string;
}) {
  const image = product.images[0];
  const unit = product.variants[0]?.unit ?? "piece";
  return (
    <Link to={`/p/${product.slug}`} className="group block">
      <div className="relative overflow-hidden bg-grey-100">
        {image && (
          <ProductImage
            image={image}
            sizes={sizes}
            priority={priority}
            className={cx(
              "aspect-[4/5] w-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out) group-hover:scale-[1.03]",
              product.soldOut && "opacity-60",
            )}
          />
        )}
        <div className="absolute left-2 top-2">
          <StockTag product={product} />
        </div>
      </div>
      <h3
        className={cx(
          "mt-3 font-sans text-base font-medium leading-snug tracking-normal",
          tone === "dark" ? "text-paper" : "text-ink",
        )}
      >
        <span className="group-hover:underline group-hover:underline-offset-4">{product.title}</span>
      </h3>
      <p className={cx("tabular mt-1 text-[15px]", tone === "dark" ? "text-grey-300" : "text-grey-600")}>
        {product.variants.length > 1 && product.variants.some((v) => v.price.amount !== product.fromPrice.amount)
          ? "From "
          : ""}
        {formatMoney(product.fromPrice)}
        {unit !== "piece" ? ` per ${unitLabel(unit, 1)}` : ""}
      </p>
    </Link>
  );
}
