import { useRef, useState } from "react";
import { Link } from "react-router";
import { formatMoney, minQty, pieceNote, unitLabel, variantLabel, type CatalogueProduct } from "@hv/core";
import { CheckIcon, PlusIcon, cx } from "@hv/ui";
import { useBag } from "~/lib/bag";
import { flyToBag } from "~/lib/fly-to-bag";
import { ProductImage } from "./ProductImage";

export function StockTag({ product }: { product: CatalogueProduct }) {
  if (product.soldOut) {
    return <span className="tile-flag">Sold out</span>;
  }
  return null;
}

/** "₦8,500 per yard", "From ₦8,500 per yard", "₦35,000" */
export function priceLine(product: CatalogueProduct): string {
  return `${fromWord(product)}${formatMoney(product.fromPrice)}${perUnit(product)}`;
}

const fromWord = (p: CatalogueProduct) => (p.variants.length > 1 && p.variants.some((v) => v.price.amount !== p.fromPrice.amount) ? "From " : "");
const perUnit = (p: CatalogueProduct) => {
  const unit = p.variants[0]?.unit ?? "piece";
  const note = pieceNote(p.line, unit);
  if (note) return ` per piece (${note})`;
  return unit !== "piece" ? ` per ${unitLabel(unit, 1)}` : "";
};

/** The second line under a tile: what you choose, or how it's sold. */
function subLine(p: CatalogueProduct): string {
  const colours = new Set(p.variants.map((v) => v.colour).filter(Boolean)).size;
  const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))];
  const how = perUnit(p).trim();
  if (sizes.length > 1) return `Sizes ${sizes.join(", ")}`;
  if (colours > 1) return `${colours} colours${how ? ` · ${how}` : ""}`;
  return how ? how.charAt(0).toUpperCase() + how.slice(1) : "Ready to wear";
}

/**
 * Quick add: one tap puts the smallest order in the bag (2 yards of cloth, one piece). A product
 * with sizes or several colours sends the shopper to its page to choose instead of guessing.
 * "icon" is the round + on a tile; "text" is a labelled button.
 */
export function QuickAdd({ product, className, variant = "text" }: { product: CatalogueProduct; className?: string; variant?: "text" | "icon" }) {
  const bag = useBag();
  const ref = useRef<HTMLButtonElement>(null);
  const [added, setAdded] = useState(false);
  const inStock = product.variants.filter((v) => v.available > 0);
  if (product.soldOut || inStock.length === 0) return null;
  const choose = product.variants.some((v) => v.size) ? "size" : "colour";
  if (inStock.length > 1) {
    return variant === "icon" ? (
      <Link to={`/p/${product.slug}`} className={cx("tile-plus", className)} aria-label={`Choose ${choose}: ${product.title}`}>
        <PlusIcon size={18} />
      </Link>
    ) : (
      <Link to={`/p/${product.slug}`} className={cx("quick-add", className)}>
        Choose {choose}
      </Link>
    );
  }
  const v = inStock[0]!;
  const qty = minQty(v.unit);
  const amount = `${qty} ${unitLabel(v.unit, qty)}`;
  const add = () => {
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
  };
  if (variant === "icon") {
    return (
      <button ref={ref} type="button" onClick={add} className={cx("tile-plus", added && "is-added", className)} aria-label={added ? `Added ${amount} of ${product.title}` : `Add ${amount} of ${product.title} to bag`}>
        {added ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
        <span className="sr-only" aria-live="polite">{added ? "Added" : ""}</span>
      </button>
    );
  }
  return (
    <button ref={ref} type="button" className={cx("quick-add", added && "is-added", className)} onClick={add}>
      {added ? (
        <>
          <span className="add-check" aria-hidden="true" />
          Added {amount}
        </>
      ) : (
        <>
          <PlusIcon size={16} /> Quick add<span className="sr-only">: {product.title}, {amount}</span>
        </>
      )}
    </button>
  );
}

/** A product tile (drop.code): soft grey tile, round + top right, name and price underneath. */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  quickAdd = false,
  headingLevel = 3,
}: {
  product: CatalogueProduct;
  priority?: boolean;
  sizes?: string;
  quickAdd?: boolean;
  headingLevel?: 2 | 3;
}) {
  const image = product.images[0];
  const second = product.images[1];
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="tile-card product-card group">
      {quickAdd ? <QuickAdd product={product} variant="icon" /> : null}
      <Link to={`/p/${product.slug}`} className="block">
        <div className="tile-media">
          {image ? (
            <ProductImage image={image} sizes={sizes} priority={priority} className={cx("product-card-img size-full object-cover", product.soldOut && "opacity-60")} />
          ) : null}
          {/* The drape view comes in on hover, where the device can hover. */}
          {second && !product.soldOut ? <ProductImage image={second} sizes={sizes} className="product-card-alt absolute inset-0 size-full object-cover" /> : null}
          <StockTag product={product} />
        </div>
        <div className="tile-meta">
          <H className="tile-name">
            <span className="product-card-name">{product.title}</span>
          </H>
          <p className="tile-price tabular">
            {fromWord(product) ? <span className="font-normal text-grey-600">From </span> : null}
            {formatMoney(product.fromPrice)}
          </p>
        </div>
        <p className="tile-sub">{subLine(product)}</p>
      </Link>
    </div>
  );
}
