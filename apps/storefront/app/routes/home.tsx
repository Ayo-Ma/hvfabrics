import { useState } from "react";
import { Link } from "react-router";
import { formatMoney, LINES, unitLabel, type CatalogueProduct, type Line } from "@hv/core";
import { ArrowRightIcon, cx } from "@hv/ui";
import placeholderHero from "@hv/ui/illustrations/placeholder-hero.svg?url";
import type { Route } from "./+types/home";
import { getCatalogue } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { ProductCard } from "~/components/ProductCard";
import { ProductImage } from "~/components/ProductImage";
import { ButtonLink } from "~/components/Button";

export function meta() {
  return [
    { title: "Harries Vogue · Fabrics, lingerie and ready-to-wear from Lagos" },
    {
      name: "description",
      content: "Lace, ankara and sequin fabrics by the yard, lingerie and ready-to-wear from Harries Vogue in Abule Egba, Lagos.",
    },
    { property: "og:title", content: "Harries Vogue" },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const catalogue = await getCatalogue(context.cloudflare.env);
  const inStock = catalogue.products.filter((p) => !p.soldOut);
  return {
    newIn: inStock.slice(0, 4),
    fabrics: catalogue.products.filter((p) => p.line === "fabric").slice(0, 8),
    counts: Object.fromEntries(LINES.map((l) => [l, catalogue.products.filter((p) => p.line === l).length])) as Record<Line, number>,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { newIn, fabrics, counts } = loaderData;
  return (
    <>
      {/* 1. First screen: what this is, then real stock straight away. Painted at once, never held for an
          entrance animation: the headline is the page's largest paint (LCP), so hiding it until script
          loads cost ~1.5 s on a 4G phone. Sections further down still rise in. */}
      <section className="bg-ink text-paper" aria-labelledby="home-title">
        <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-20 pt-12 md:pb-28 md:pt-16">
          <h1
            id="home-title"
            className="text-[clamp(2.25rem,0.9rem+5.6vw,6rem)] leading-[0.98] tracking-(--tracking-display)"
          >
            Fabrics, lingerie and ready&#8209;to&#8209;wear
          </h1>
          <div className="mt-8 grid gap-10 md:mt-12 md:grid-cols-12 md:items-start">
            <p className="max-w-xl text-lg text-grey-200 md:col-span-6">
              From our shop in Abule Egba, Lagos. Choose the yards you need and pay securely with Paystack.
            </p>
            <div className="md:col-span-5 md:col-start-8">
              <ul className="text-lg">
                {LINES.map((line) => (
                  <li key={line}>
                    <Link
                      to={LINE_PATHS[line]}
                      className="group flex items-center justify-between gap-4 py-3 font-medium transition-colors hover:text-yellow"
                    >
                      <span>{LINE_LABELS[line]}</span>
                      <span className="flex items-center gap-3 text-[15px] text-grey-300 group-hover:text-yellow">
                        <span className="tabular">{counts[line]} pieces</span>
                        <ArrowRightIcon size={20} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink to="/fabrics" className="mt-6 w-full md:w-auto">
                Shop fabrics
              </ButtonLink>
            </div>
          </div>

          <div className="mt-20 md:mt-28">
            <h2 className="text-2xl" data-rise>
              New in
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {newIn.map((p, i) => (
                <li key={p.id} data-rise style={{ ["--rise-i" as string]: i }}>
                  <ProductCard product={p} tone="dark" priority={i < 2} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 2. The three lines as one band of unequal panels. */}
      <LineBand />

      {/* 3. Fabrics as an index: name, price per yard, yards left; the picture follows the row. */}
      {fabrics.length > 0 && <FabricIndex products={fabrics} />}

      {/* 4. Practical details last, as plain text. */}
      <section className="bg-ink text-paper" aria-labelledby="buying-title">
        <div className="mx-auto grid max-w-(--container-page) gap-10 px-(--spacing-gutter) py-24 md:grid-cols-12 md:py-32">
          <h2 id="buying-title" className="text-3xl md:col-span-4" data-rise>
            Buying from us
          </h2>
          <div className="grid gap-8 text-lg md:col-span-8 md:grid-cols-2" data-rise style={{ ["--rise-i" as string]: 1 }}>
            <div>
              <h3 className="font-sans text-lg font-semibold tracking-normal">Pay securely</h3>
              <p className="mt-2 text-grey-200">
                Payments go through Paystack. We never see or store your card details.
              </p>
            </div>
            <div>
              <h3 className="font-sans text-lg font-semibold tracking-normal">Delivery</h3>
              <p className="mt-2 text-grey-200">[TBC: delivery areas, fees and times]</p>
            </div>
            <div>
              <h3 className="font-sans text-lg font-semibold tracking-normal">See it in person</h3>
              <p className="mt-2 text-grey-200">
                Visit the shop in Abule Egba to touch the fabric before you buy. [TBC: address and hours]
              </p>
            </div>
            <div>
              <h3 className="font-sans text-lg font-semibold tracking-normal">Questions</h3>
              <p className="mt-2 text-grey-200">[TBC: WhatsApp number] · or track an order <Link to="/track" className="underline underline-offset-4 hover:text-yellow">here</Link>.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const GROW: Record<Line, string> = {
  fabric: "lg:grow-[5]",
  lingerie: "lg:grow-[2]",
  rtw: "lg:grow-[3]",
};

function LineBand() {
  return (
    <section className="bg-ink pb-24 text-paper md:pb-32" aria-labelledby="lines-title">
      <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter)">
        <h2 id="lines-title" className="text-3xl md:pl-[16.66%]" data-rise>
          Shop by line
        </h2>
      </div>
      <ul className="mx-auto mt-12 grid max-w-(--container-page) grid-cols-2 px-(--spacing-gutter) lg:flex lg:h-[68svh]">
        {LINES.map((line, i) => (
          <li
            key={line}
            className={cx(
              "group relative min-h-[42svh] basis-0 overflow-hidden transition-[flex-grow] duration-500 ease-(--ease-out) lg:min-h-0 lg:hover:grow-[6] lg:focus-within:grow-[6]",
              GROW[line],
              i === 0 && "col-span-2",
            )}
          >
            <img
              src={placeholderHero}
              alt=""
              width={1600}
              height={2000}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <Link
              to={LINE_PATHS[line]}
              className="absolute inset-0 flex flex-col justify-end bg-ink/35 p-6 transition-colors group-hover:bg-ink/20 md:p-8"
            >
              <span className="font-display text-3xl font-black tracking-(--tracking-heading)">{LINE_LABELS[line]}</span>
              <span className="mt-2 max-w-sm text-[15px] text-grey-100">{LINE_INTROS[line]}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold">
                Shop {LINE_LABELS[line].toLowerCase()}
                <ArrowRightIcon size={20} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FabricIndex({ products }: { products: CatalogueProduct[] }) {
  const [active, setActive] = useState(0);
  const current = products[active] ?? products[0]!;
  return (
    <section className="bg-paper text-ink" aria-labelledby="fabric-index-title">
      <div className="mx-auto grid max-w-(--container-page) gap-10 px-(--spacing-gutter) py-24 md:grid-cols-12 md:py-32">
        <div className="hidden md:col-span-5 md:block">
          <div className="sticky top-[12vh]">
            {current.images[0] && (
              <ProductImage
                key={current.id}
                image={current.images[0]}
                sizes="34vw"
                className="aspect-[4/5] w-full animate-[fade-in_240ms_ease-out] bg-grey-100 object-cover"
              />
            )}
          </div>
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <h2 id="fabric-index-title" className="text-3xl" data-rise>
            Fabrics by the yard
          </h2>
          <p className="mt-3 text-lg text-grey-600" data-rise style={{ ["--rise-i" as string]: 1 }}>
            What's on the shelf now, with what's left.
          </p>
          <ul className="mt-10">
            {products.map((p, i) => {
              const yardsLeft = p.variants.reduce((n, v) => n + v.available, 0);
              const unit = p.variants[0]?.unit ?? "yard";
              return (
                <li key={p.id}>
                  <Link
                    to={`/p/${p.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={cx(
                      "flex min-h-[58px] items-center justify-between gap-4 py-3 transition-colors",
                      i === active ? "text-ink" : "text-grey-600 hover:text-ink",
                    )}
                  >
                    <span className={cx("text-xl", i === active ? "font-semibold" : "font-medium")}>{p.title}</span>
                    <span className="tabular shrink-0 text-right text-[15px]">
                      {formatMoney(p.fromPrice)} / {unitLabel(unit, 1)}
                      <span className="block text-grey-600">
                        {p.soldOut ? "Sold out" : `${yardsLeft} ${unitLabel(unit, yardsLeft)} left`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <ButtonLink to="/fabrics" variant="ink" className="mt-10">
            All fabrics
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
