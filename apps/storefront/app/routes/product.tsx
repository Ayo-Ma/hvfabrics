import { useEffect, useRef, useState } from "react";
import { Link, data, useRevalidator } from "react-router";
import { minQty, formatMoney, toMajorString, unitLabel, variantLabel, type CatalogueVariant } from "@hv/core";
import { CheckIcon, MinusIcon, PlusIcon, RulerIcon, TruckIcon, cx } from "@hv/ui";
import type { Route } from "./+types/product";
import { getProduct, getSettings } from "~/lib/catalogue.server";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { useBag } from "~/lib/bag";
import { flyToBag } from "~/lib/fly-to-bag";
import { ProductImage } from "~/components/ProductImage";
import { StockTag } from "~/components/ProductCard";
import { YardTape } from "~/components/YardTape";
import { Button } from "~/components/Button";
import { SHOP, SHOP_CITIES, feeLabel } from "~/lib/shop";
import { CUTOFF_MIN, span, useLagosClock } from "~/lib/clock";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const [product, settings] = await Promise.all([getProduct(env, params.slug), getSettings(env)]);
  if (!product) throw data(null, { status: 404 });
  // Yards chosen on the Fabrics page carry over to the tape.
  const y = Number(new URL(request.url).searchParams.get("yards"));
  const yards = Number.isInteger(y) && y >= 1 && y <= 30 ? y : null;
  return { product, yards, zones: settings.deliveryZones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, eta: z.eta })) };
}

export function meta({ data, location }: Route.MetaArgs) {
  if (!data) return [];
  const p = data.product;
  const description = p.description.startsWith("[TBC") ? `${p.title} from Harries Vogue, delivered across Nigeria.` : p.description.slice(0, 155);
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
  const { product, zones } = loaderData;
  useLiveStock();
  const bag = useBag();
  const addRef = useRef<HTMLButtonElement>(null);
  const firstAvailable = product.variants.find((v) => v.available > 0) ?? product.variants[0]!;
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const inBag = bag.items.find((i) => i.variantId === variant.id)?.qty ?? 0;
  const canAdd = Math.max(0, variant.available - inBag);
  const min = minQty(variant.unit);
  const [wantedQty, setQty] = useState(variant.unit === "yard" ? Math.min(loaderData.yards ?? min, Math.max(min, variant.available)) : 1);
  const [added, setAdded] = useState(false);
  // Always inside what can still be bought, even after the variant or live stock changes.
  const qty = Math.min(Math.max(min, wantedQty), Math.max(min, canAdd));
  // The bag already holds the most one order line can take.
  const belowMin = variant.available > 0 && canAdd < min;

  const optionKind = product.variants.some((v) => v.size) ? "Size" : product.variants.some((v) => v.colour) ? "Colour" : null;
  const isYard = variant.unit === "yard";

  async function addToBag() {
    if (canAdd < min) return;
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
        {/* Gallery: the main view large, with a loupe on hover; the other views in a strip below. */}
        <div className="md:col-span-7" data-rise>
          <Gallery images={product.images} title={product.title} />
        </div>

        <div className="md:col-span-5">
          <div className="md:sticky md:top-24">
            <div className="flex items-start justify-between gap-4">
              <h1 className="product-title cover-fade">{product.title}</h1>
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
              ) : belowMin ? (
                <p className="text-lg font-medium">
                  You already have the most one order can take in your bag.
                </p>
              ) : isYard ? (
                <YardTape value={qty} onChange={setQty} available={canAdd || 1} unit={variant.unit} unitPrice={variant.price} />
              ) : (
                <QuantityStepper value={qty} max={Math.max(1, canAdd)} onChange={setQty} />
              )}
            </div>

            <Button
              ref={addRef}
              type="button"
              className="mt-6 w-full"
              onClick={addToBag}
              disabled={variant.available === 0 || canAdd < min}
            >
              {variant.available === 0 ? "Sold out" : canAdd < min ? "Already in your bag" : added ? (
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

            <div className="spec-label mt-10" data-rise>
              <h2 className="spec-label-title">About this piece</h2>
              <p className="mt-2">{product.description}</p>
              {(product.attributes.fibre || product.attributes.width || product.attributes.care) && (
                <dl className="spec-facts">
                  {product.attributes.fibre && (
                    <div>
                      <dt>Fibre</dt>
                      <dd>{product.attributes.fibre}</dd>
                    </div>
                  )}
                  {product.attributes.width && (
                    <div>
                      <dt>Width</dt>
                      <dd>{product.attributes.width}</dd>
                    </div>
                  )}
                  {product.attributes.care && (
                    <div>
                      <dt>Care</dt>
                      <dd>{product.attributes.care}</dd>
                    </div>
                  )}
                </dl>
              )}
              {product.line === "rtw" && (
                <p className="mt-4 flex gap-3 text-[15px]">
                  <RulerIcon className="shrink-0" />
                  <span>Sizes S, M and L. Want it made to measure? <a className="underline underline-offset-4" href={SHOP.whatsapp} target="_blank" rel="noopener">Message us</a>.</span>
                </p>
              )}
            </div>

            <DeliveryCalc zones={zones} />
          </div>
        </div>
      </div>

      <Questions isFabric={isYard} />
    </div>
  );
}

/* ---------------- Gallery with a loupe ---------------- */

function Gallery({ images, title }: { images: Route.ComponentProps["loaderData"]["product"]["images"]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const main = images[active] ?? images[0];
  if (!main) return null;
  return (
    <div>
      <div
        className={cx("gallery-stage", zoom && "is-zoomed")}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setZoom(null)}
        style={zoom ? ({ ["--zx" as string]: `${zoom.x}%`, ["--zy" as string]: `${zoom.y}%` } as React.CSSProperties) : undefined}
      >
        {images.map((img, i) => (
          <div key={i} aria-hidden={i !== active} className={cx("gallery-frame", i === active && "is-active")}>
            <ProductImage image={img} sizes="(min-width: 768px) 58vw, 100vw" priority={i === 0} className="gallery-img" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <ul className="gallery-strip" aria-label={`${title} photos`}>
          {images.map((img, i) => (
            <li key={i}>
              <button type="button" className={cx("gallery-thumb", i === active && "is-on")} aria-pressed={i === active} aria-label={`Show ${img.alt}`} onClick={() => setActive(i)}>
                <ProductImage image={img} sizes="120px" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Delivery calculator ---------------- */

type Zone = Route.ComponentProps["loaderData"]["zones"][number];

function DeliveryCalc({ zones }: { zones: Zone[] }) {
  const [id, setId] = useState<string | null>(null);
  const mins = useLagosClock();
  const zone = zones.find((z) => z.id === id);
  const pickup = zone?.id.startsWith("pickup");
  const when = mins === null ? `Orders paid before ${SHOP.sameDayCutoff} go out the same day.` : mins < CUTOFF_MIN ? `Pay in the next ${span(CUTOFF_MIN - mins)} and it goes out today.` : `Paid now, it goes out on the next dispatch, from ${SHOP.sameDayCutoff}.`;
  return (
    <section className="deliver mt-8" aria-labelledby="deliver-title" data-rise style={{ ["--rise-i" as string]: 1 }}>
      <h2 id="deliver-title" className="flex items-center gap-2 text-[15px] font-semibold">
        <TruckIcon /> Where should it go?
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {zones.map((z) => (
          <button key={z.id} type="button" aria-pressed={z.id === id} className={cx("chip", z.id === id && "is-on")} onClick={() => setId(z.id)}>
            {z.id.startsWith("pickup") ? z.name.replace("Collect from our ", "Collect, ").replace(" shop", "") : z.name}
          </button>
        ))}
      </div>
      <p className="deliver-answer mt-4" aria-live="polite">
        {zone ? (
          <span key={zone.id} className="tick">
            <strong className="tabular">{feeLabel(zone)}</strong> {pickup ? `· ${zone.eta}` : zone.eta && !zone.eta.startsWith("[TBC") ? `· ${zone.eta}` : "delivery"}. {pickup ? "We'll message you when it's ready." : when}
          </span>
        ) : (
          <span>Choose a city to see the fee. Or collect free from our shop in {SHOP_CITIES}.</span>
        )}
      </p>
      <p className="mt-2 text-[15px] text-grey-600">
        Somewhere else, or abroad? <a className="underline underline-offset-4" href={SHOP.whatsapp} target="_blank" rel="noopener">Message us</a>.{" "}
        <Link to="/policies/delivery" className="underline underline-offset-4">Delivery policy</Link>
      </p>
    </section>
  );
}

/* ---------------- Questions, filed like index cards ---------------- */

function Questions({ isFabric }: { isFabric: boolean }) {
  const cards = [
    ...(isFabric ? [{ tab: "Cutting", q: "How is the fabric cut?", a: "We measure and cut from the bolt to the exact yards you order, from 2 yards up. Need more than 30? Add 30, then add again from the bag." }] : []),
    { tab: "Delivery", q: "When will it reach me?", a: `Orders paid before ${SHOP.sameDayCutoff} go out the same day by Speedaf or park dispatch, to Lagos, Abuja, Ibadan, Akure, Osogbo and Abeokuta. The fee for your city is shown at checkout.` },
    { tab: "Collect", q: "Can I pick it up myself?", a: `Yes, free, from our shop in Ilorin (Beckadims Resort, Tanke Oke Odo) or Abeokuta (Odo Eran, Obantoko), ${SHOP.hours}. Choose collection at checkout.` },
    { tab: "Returns", q: "Can I return it?", a: "All sales are final, including fabric once it's cut. If we send the wrong item, or it left us damaged, tell us on WhatsApp and we'll refund you by bank transfer." },
    { tab: "Colour", q: "Will the colour match my screen?", a: "Screens differ, so the real fabric can look slightly different. Not sure? Message us and we'll send you a photo or video in daylight." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="cards-drawer" aria-labelledby="questions-title">
      <h2 id="questions-title" className="chapter-title" data-rise>Before you buy</h2>
      <div className="drawer">
        {cards.map((c, i) => (
          <div key={c.tab} className={cx("drawer-card", i % 2 ? "tone-b" : "tone-a", i === open && "is-open")} style={{ ["--i" as string]: i, ["--rise-i" as string]: i }} data-rise>
            <span className="drawer-tab" aria-hidden="true">{c.tab}</span>
            <button type="button" className="drawer-q" aria-expanded={i === open} aria-controls={`card-${i}`} onClick={() => setOpen(i)}>
              {c.q}
            </button>
            <div id={`card-${i}`} className="drawer-a" inert={i !== open}>
              <p>{c.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VariantOption({ v, selected, onSelect }: { v: CatalogueVariant; selected: boolean; onSelect: () => void }) {
  const soldOut = v.available === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${v.size ?? v.colour}${soldOut ? ", sold out" : ""}`}
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
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
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
    </div>
  );
}
