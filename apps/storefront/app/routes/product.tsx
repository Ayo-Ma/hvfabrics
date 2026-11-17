import { useEffect, useRef, useState } from "react";
import { Link, data, useRevalidator } from "react-router";
import { formatMoney, toMajorString, unitLabel, variantLabel, type CatalogueVariant } from "@hv/core";
import { CheckIcon, MinusIcon, PlusIcon, RulerIcon, TruckIcon, cx } from "@hv/ui";
import type { Route } from "./+types/product";
import { getProduct } from "~/lib/catalogue.server";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { useBag } from "~/lib/bag";
import { flyToBag } from "~/lib/fly-to-bag";
import { ProductImage } from "~/components/ProductImage";
import { StockTag } from "~/components/ProductCard";
import { YardTape } from "~/components/YardTape";
import { Button } from "~/components/Button";

export async function loader({ params, context }: Route.LoaderArgs) {
  const product = await getProduct(context.cloudflare.env, params.slug);
  if (!product) throw data(null, { status: 404 });
  return { product };
}

export function meta({ data, location }: Route.MetaArgs) {
  if (!data) return [];
  const p = data.product;
  const description = p.description.startsWith("[TBC") ? `${p.title} from Harries Vogue, Lagos.` : p.description.slice(0, 155);
  return [
    { title: `${p.title} · Harries Vogue` },
    { name: "description", content: description },
    { property: "og:title", content: p.title },
    { property: "og:type", content: "product" },
    { tagName: "link", rel: "canonical", href: location.pathname },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description,
        sku: p.variants[0]?.sku,
        brand: { "@type": "Brand", name: "Harries Vogue" },
        offers: p.variants.map((v) => ({
          "@type": "Offer",
          sku: v.sku,
          priceCurrency: v.price.currency,
          price: toMajorString(v.price),
          availability: v.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        })),
      },
    },
  ];
}

/** Live stock: re-read the catalogue when the tab regains focus and every 60 s while open. */
function useLiveStock() {
  const { revalidate, state } = useRevalidator();
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && state === "idle" && revalidate();
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(onVisible, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [revalidate, state]);
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;
  useLiveStock();
  const bag = useBag();
  const addRef = useRef<HTMLButtonElement>(null);
  const firstAvailable = product.variants.find((v) => v.available > 0) ?? product.variants[0]!;
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const inBag = bag.items.find((i) => i.variantId === variant.id)?.qty ?? 0;
  const canAdd = Math.max(0, variant.available - inBag);
  const [wantedQty, setQty] = useState(variant.unit === "yard" ? Math.min(5, Math.max(1, variant.available)) : 1);
  const [added, setAdded] = useState(false);
  // Always inside what can still be bought, even after the variant or live stock changes.
  const qty = Math.min(Math.max(1, wantedQty), Math.max(1, canAdd));

  const optionKind = product.variants.some((v) => v.size) ? "Size" : product.variants.some((v) => v.colour) ? "Colour" : null;
  const isYard = variant.unit === "yard";

  async function addToBag() {
    if (canAdd < 1) return;
    bag.add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        variantLabel: variantLabel(variant),
        unit: variant.unit,
        unitPrice: variant.price,
        max: variant.available,
        ...(product.images[0] ? { image: product.images[0] } : {}),
      },
      Math.min(qty, canAdd),
    );
    setAdded(true);
    await flyToBag(addRef.current);
    setTimeout(() => setAdded(false), 2400);
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-24 pt-6 md:pt-10">
      <nav aria-label="Breadcrumb" className="text-[15px] text-grey-600">
        <Link to={LINE_PATHS[product.line]} className="underline-offset-4 hover:text-ink hover:underline">
          {LINE_LABELS[product.line]}
        </Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-12 md:gap-12">
        {/* Gallery: stacked on desktop, swipeable on phones. */}
        <div className="-mx-(--spacing-gutter) md:col-span-7 md:mx-0">
          {/* Scrolls sideways on phones: focusable and named so keyboard users can scroll it too (WCAG 2.1.1). */}
          <ul
            tabIndex={0}
            aria-label={`${product.title} photos`}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto focus-visible:outline-offset-4 md:grid md:gap-4 md:overflow-visible"
          >
            {product.images.map((img, i) => (
              <li key={i} className="w-[86%] shrink-0 snap-start first:pl-(--spacing-gutter) md:w-auto md:first:pl-0">
                <ProductImage
                  image={img}
                  sizes="(min-width: 768px) 58vw, 86vw"
                  priority={i === 0}
                  className="aspect-[4/5] w-full bg-grey-100 object-cover"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-5">
          <div className="md:sticky md:top-24">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-[clamp(1.75rem,1.1rem+1.4vw,2.5rem)] leading-[1.05] tracking-(--tracking-display)">{product.title}</h1>
              <div className="shrink-0 pt-2">
                <StockTag product={product} />
              </div>
            </div>
            {!isYard && (
              <p className="tabular mt-3 text-xl font-semibold">{formatMoney(variant.price)}</p>
            )}

            {optionKind && product.variants.length > 1 && (
              <fieldset className="mt-8">
                <legend className="text-[15px] font-medium">
                  {optionKind}: <span className="text-grey-600">{variant.size ?? variant.colour}</span>
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <VariantOption key={v.id} v={v} selected={v.id === variant.id} onSelect={() => setVariantId(v.id)} />
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-8">
              {variant.available === 0 ? (
                <p className="text-lg font-medium">This {optionKind?.toLowerCase() ?? "piece"} is sold out.</p>
              ) : isYard ? (
                <YardTape value={qty} onChange={setQty} available={canAdd || 1} unit={variant.unit} unitPrice={variant.price} />
              ) : (
                <QuantityStepper value={qty} max={Math.max(1, canAdd)} onChange={setQty} available={variant.available} />
              )}
            </div>

            <Button
              ref={addRef}
              type="button"
              className="mt-6 w-full"
              onClick={addToBag}
              disabled={variant.available === 0 || canAdd < 1}
            >
              {variant.available === 0 ? "Sold out" : canAdd < 1 ? "All available units are in your bag" : added ? (
                <>
                  <CheckIcon /> Added to bag
                </>
              ) : (
                "Add to bag"
              )}
            </Button>
            {inBag > 0 && (
              <p className="mt-3 text-[15px] text-grey-600">
                {inBag} {unitLabel(variant.unit, inBag)} already in your bag.{" "}
                <button type="button" onClick={bag.open} className="font-medium text-ink underline underline-offset-4">
                  View bag
                </button>
              </p>
            )}

            <div className="mt-10 space-y-6 text-base">
              <div>
                <h2 className="font-sans text-base font-semibold tracking-normal">About this piece</h2>
                <p className="mt-2 text-grey-700">{product.description}</p>
              </div>
              {(product.attributes.fibre || product.attributes.width || product.attributes.care) && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {product.attributes.fibre && (
                    <>
                      <dt className="font-medium">Fibre</dt>
                      <dd className="text-grey-700">{product.attributes.fibre}</dd>
                    </>
                  )}
                  {product.attributes.width && (
                    <>
                      <dt className="font-medium">Width</dt>
                      <dd className="text-grey-700">{product.attributes.width}</dd>
                    </>
                  )}
                  {product.attributes.care && (
                    <>
                      <dt className="font-medium">Care</dt>
                      <dd className="text-grey-700">{product.attributes.care}</dd>
                    </>
                  )}
                </dl>
              )}
              <ul className="space-y-3 text-[15px]">
                <li className="flex gap-3">
                  <TruckIcon className="shrink-0" />
                  <span>
                    Delivery: [TBC: zones and times].{" "}
                    <Link to="/policies/delivery" className="underline underline-offset-4">
                      Delivery policy
                    </Link>
                  </span>
                </li>
                {product.line !== "fabric" && (
                  <li className="flex gap-3">
                    <RulerIcon className="shrink-0" />
                    <span>[TBC: size guide arrives in Phase 3]</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantOption({ v, selected, onSelect }: { v: CatalogueVariant; selected: boolean; onSelect: () => void }) {
  const soldOut = v.available === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${v.size ?? v.colour}${soldOut ? ", sold out" : v.lowStock ? `, only ${v.available} left` : ""}`}
      className={cx(
        "min-h-11 min-w-12 px-4 text-[15px] font-medium transition-colors",
        selected ? "bg-ink text-paper" : "bg-grey-100 text-ink hover:bg-grey-200",
        soldOut && "text-grey-500 line-through decoration-1",
        soldOut && selected && "text-grey-300",
      )}
    >
      {v.size ?? v.colour}
    </button>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
  available,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  available: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center bg-grey-100">
        <button
          type="button"
          className="grid size-12 place-items-center hover:bg-grey-200 disabled:text-grey-300"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="One less"
        >
          <MinusIcon />
        </button>
        <span className="tabular min-w-12 text-center text-lg font-medium" aria-live="polite" aria-label={`Quantity ${value}`}>
          {value}
        </span>
        <button
          type="button"
          className="grid size-12 place-items-center hover:bg-grey-200 disabled:text-grey-300"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="One more"
        >
          <PlusIcon />
        </button>
      </div>
      <p className="tabular text-[15px] text-grey-600">{available <= 5 ? `Only ${available} left` : `${available} in stock`}</p>
    </div>
  );
}
