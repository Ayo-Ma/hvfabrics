import { useRef, useState } from "react";
import { Link } from "react-router";
import { formatMoney, minQty, unitLabel, variantLabel, type CatalogueProduct } from "@hv/core";
import { PlusIcon, cx } from "@hv/ui";
import { useBag } from "~/lib/bag";
import { flyToBag } from "~/lib/fly-to-bag";
import { ProductImage } from "./ProductImage";

export function StockTag({ product }: { product: CatalogueProduct }) {
  if (product.soldOut) {
    return <span className="bg-ink px-2 py-1 text-[13px] font-medium text-paper">Sold out</span>;
  }
  return null;
}

/** "₦8,500 per yard", "From ₦8,500 per yard", "₦35,000" */
export function priceLine(product: CatalogueProduct): string {
  const unit = product.variants[0]?.unit ?? "piece";
  const from = product.variants.length > 1 && product.variants.some((v) => v.price.amount !== product.fromPrice.amount) ? "From " : "";
  return `${from}${formatMoney(product.fromPrice)}${unit !== "piece" ? ` per ${unitLabel(unit, 1)}` : ""}`;
}

/**
 * Quick add: one tap puts the smallest order in the bag (2 yards of cloth, one piece). A product
 * with sizes or several colours sends the shopper to its page to choose instead of guessing.
 */
export function QuickAdd({ product, className }: { product: CatalogueProduct; className?: string }) {
  const bag = useBag();
  const ref = useRef<HTMLButtonElement>(null);
  const [added, setAdded] = useState(false);
  const inStock = product.variants.filter((v) => v.available > 0);
  if (product.soldOut || inStock.length === 0) return null;
  if (inStock.length > 1) {
    return (
      <Link to={`/p/${product.slug}`} className={cx("quick-add", className)}>
        Choose {product.variants.some((v) => v.size) ? "size" : "colour"}
      </Link>
    );
  }
  const v = inStock[0]!;
  const qty = minQty(v.unit);
  return (
    <button
      ref={ref}
      type="button"
      className={cx("quick-add", added && "is-added", className)}
      onClick={() => {
        bag.add(
          {
            variantId: v.id,
            productId: product.id,
            slug: product.slug,
            title: product.title,
            variantLabel: variantLabel(v),
            unit: v.unit,
            unitPrice: v.price,
            max: v.available,
            ...(product.images[0] ? { image: product.images[0] } : {}),
          },
          qty,
        );
        setAdded(true);
        void flyToBag(ref.current);
        setTimeout(() => setAdded(false), 2200);
      }}
    >
      {added ? (
        <>
          <span className="add-check" aria-hidden="true" />
          Added {qty} {unitLabel(v.unit, qty)}
        </>
      ) : (
        <>
          <PlusIcon size={16} /> Quick add<span className="sr-only">: {product.title}, {qty} {unitLabel(v.unit, qty)}</span>
        </>
      )}
    </button>
  );
}

export function ProductCard({
  product,
  tone = "light",
  priority = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  quickAdd = false,
  ratio = "portrait",
  headingLevel = 3,
}: {
  product: CatalogueProduct;
  tone?: "light" | "dark";
  priority?: boolean;
  sizes?: string;
  quickAdd?: boolean;
  ratio?: "portrait" | "tall" | "square";
  headingLevel?: 2 | 3;
}) {
  const image = product.images[0];
  const second = product.images[1];
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="product-card group relative">
      <Link to={`/p/${product.slug}`} className="block">
        <div className={cx("relative overflow-hidden bg-grey-100", ratio === "tall" ? "aspect-[3/4]" : ratio === "square" ? "aspect-square" : "aspect-[4/5]")}>
          {image && (
            <ProductImage
              image={image}
              sizes={sizes}
              priority={priority}
              className={cx("product-card-img size-full object-cover", product.soldOut && "opacity-60")}
            />
          )}
          {/* The drape view comes in on hover, where the device can hover. */}
          {second && !product.soldOut ? (
            <ProductImage image={second} sizes={sizes} className="product-card-alt absolute inset-0 size-full object-cover" />
          ) : null}
          <div className="absolute left-2 top-2">
            <StockTag product={product} />
          </div>
        </div>
        <H className={cx("mt-3 font-sans text-base font-medium leading-snug tracking-normal", tone === "dark" ? "text-paper" : "text-ink")}>
          <span className="product-card-name">{product.title}</span>
        </H>
        <p className={cx("tabular mt-1 text-[15px]", tone === "dark" ? "text-grey-300" : "text-grey-600")}>{priceLine(product)}</p>
      </Link>
      {quickAdd ? <QuickAdd product={product} className="mt-3" /> : null}
    </div>
  );
}
