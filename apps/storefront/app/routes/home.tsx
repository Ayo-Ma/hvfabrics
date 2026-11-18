import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { formatMoney, LINES, multiply, unitLabel, variantLabel, type CatalogueProduct, type Line } from "@hv/core";
import { ArrowRightIcon, cx } from "@hv/ui";
import type { Route } from "./+types/home";
import { getCatalogue, getSettings } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { useBag } from "~/lib/bag";
import { flyToBag } from "~/lib/fly-to-bag";
import { Button, ButtonLink } from "~/components/Button";
import { Media } from "~/components/Media";
import { YardTape } from "~/components/YardTape";

/*
 * Home — a magazine cover, then the counter (design-taste-frontend, seed 852726007).
 * Idea: the counter ritual (the bolt → the yard → the cut → the occasion) becomes the fixed stage —
 * one photograph stays in view and changes chapter by chapter while the column beside it sells the
 * yards. Headlines are set in Futura capitals (client decision 2026-11-18). The fabric's printed edge (the selvedge) is the one ornament; the process is printed like
 * the shop's own cutting slip, and the yard tape writes that slip live.
 */

export function meta() {
  return [
    { title: "Harries Vogue · Fabric by the yard, lingerie and ready-to-wear from Lagos" },
    {
      name: "description",
      content: "For the wedding, the aso-ebi and the owambe you've been planning for months. Fabric, lingerie and ready-to-wear from Harries Vogue in Lagos, so you walk in looking the way you pictured it.",
    },
    { property: "og:title", content: "Harries Vogue" },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const [catalogue, settings] = await Promise.all([getCatalogue(env), getSettings(env)]);
  const byLine = Object.fromEntries(LINES.map((l) => [l, catalogue.products.filter((p) => p.line === l)])) as Record<Line, CatalogueProduct[]>;
  return {
    byLine,
    zones: settings.deliveryZones.map((z) => ({ name: z.name, fee: z.fee, eta: z.eta })),
  };
}

/* ------------------------------------------------------------------ */
/* The cover: one portrait, one headline, one action                   */
/* ------------------------------------------------------------------ */

function Cover() {
  return (
    <section aria-labelledby="home-title" className="relative bg-paper lg:grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12">
      <div className="relative lg:order-2 lg:col-span-6">
        <Media
          slot="campaign/stage-01-hero"
          alt="A woman in an ivory beaded lace iro and buba with a yellow aso-oke gele, standing by a window"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          ratio="4 / 5"
          className="cover-photo h-[40svh] w-full overflow-hidden sm:h-[60svh] lg:absolute lg:inset-0 lg:h-full"
          imgClassName="object-[50%_18%]"
        />
      </div>
      <div className="flex flex-col justify-end px-5 pb-12 pt-8 lg:justify-center lg:pt-20 sm:px-10 lg:order-1 lg:col-span-6 lg:pb-20 lg:pl-[max(2.5rem,calc((100vw-80rem)/2+var(--spacing-gutter)))] lg:pr-12">
        {/* Two set lines; on desktop the second runs on over the quiet wall of the photograph. */}
        <h1 id="home-title" className="display-size cover-title relative z-10 lg:whitespace-nowrap">
          <span className="cover-line"><span>Heads will</span></span>
          <span className="cover-line"><span style={{ animationDelay: "120ms" }}>turn</span></span>
        </h1>
        <p className="cover-fade mt-6 max-w-[36ch] text-lg leading-relaxed lg:mt-8">
          For the wedding, the aso-ebi, the owambe you&rsquo;ve been planning for months. Walk in looking the way you pictured
          it, and watch the room notice.
        </p>
        <div className="cover-fade mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 lg:mt-10" style={{ animationDelay: "380ms" }}>
          <ButtonLink to="/fabrics" className="min-h-14 px-8">Find your look</ButtonLink>
          <Link to="/ready-to-wear" className="link-quiet">Ready-to-wear</Link>
          <Link to="/lingerie" className="link-quiet">Lingerie</Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The counter: bolt → yard → cut → occasion, on a fixed stage          */
/* ------------------------------------------------------------------ */

const STAGE = [
  { slot: "campaign/stage-02-bolt", alt: "Bolts of lace, sequin and aso-oke on the dark wooden shelves of a fabric shop" },
  { slot: "campaign/stage-03-yard", alt: "Hands laying a yellow tape measure along emerald beaded lace" },
  { slot: "campaign/stage-04-cut", alt: "Tailor's shears cutting through ivory corded lace on a wooden table" },
  { slot: "campaign/stage-05-occasion", alt: "Three women in matching coral lace and gele laughing together at an evening party" },
];

/** The fabric's printed edge: the shop's name along the selvedge, the page's one ornament. */
function Selvedge({ className }: { className?: string }) {
  // Drawn by the stylesheet (::before), so it decorates without being read as page text.
  return <div aria-hidden="true" className={cx("selvedge", className)} />;
}

function useActiveChapter(count: number) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const els = refs.current.filter((e): e is HTMLElement => e !== null);
    if (!("IntersectionObserver" in window) || els.length === 0) return;
    // The chapter crossing the middle of the screen owns the stage.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [count]);
  return { active, refs };
}

function Counter() {
  const { active, refs } = useActiveChapter(STAGE.length);
  const chapter = (i: number) => ({
    "data-chapter": i,
    ref: (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
  });
  return (
    <section aria-label="From choosing to the day" className="relative bg-paper lg:grid lg:grid-cols-2">
      {/* The still half: one photograph at a time, changing with the chapter beside it. */}
      <div className="sticky top-16 hidden h-[calc(100svh-4rem)] lg:block">
        <div className="relative size-full overflow-hidden bg-grey-800">
          {STAGE.map((s, i) => (
            <div key={s.slot} aria-hidden={i !== active} className={cx("stage-frame absolute inset-0", i === active && "is-active")}>
              <Media slot={s.slot} alt={s.alt} sizes="(min-width: 1024px) 50vw, 100vw" ratio="4 / 5" tone="dark" className="size-full" />
            </div>
          ))}
          {/* Where you are in the four steps: filled bars, the current one in yellow. */}
          <div aria-hidden="true" className="stage-rail">
            {STAGE.map((s, i) => (
              <span key={s.slot} className={cx(i < active && "is-past", i === active && "is-on")} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <article {...chapter(0)} className="chapter">
          <Media slot={STAGE[0]!.slot} alt={STAGE[0]!.alt} sizes="100vw" ratio="4 / 5" tone="dark" className="-mx-5 -mt-[4.5rem] mb-10 aspect-[4/3] sm:-mx-10 lg:hidden" />
          <h2 className="chapter-title" data-rise>Choose your colour</h2>
          <p className="chapter-text" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Years from now, someone will scroll back to a photo of this day. Pick the colour you want them to see: the emerald,
            the wine, the gold, the ivory you&rsquo;ve had in mind since the invitation came.
          </p>
          <Link to="/fabrics" className="link-arrow mt-10" data-rise style={{ ["--rise-i" as string]: 2 }}>
            See the colours <ArrowRightIcon size={20} />
          </Link>
        </article>

        <article {...chapter(1)} className="chapter">
          <Media slot={STAGE[1]!.slot} alt={STAGE[1]!.alt} sizes="100vw" ratio="4 / 5" tone="dark" className="-mx-5 -mt-[4.5rem] mb-10 aspect-[4/3] sm:-mx-10 lg:hidden" />
          <h2 className="chapter-title" data-rise>The fitting goes right</h2>
          <p className="chapter-text" data-rise style={{ ["--rise-i" as string]: 1 }}>
            You turn in front of your tailor&rsquo;s mirror and it just works. It sits right, it moves with you, and for the
            first time in weeks you stop worrying about what you&rsquo;ll wear.
          </p>
        </article>

        <article {...chapter(2)} className="chapter">
          <Media slot={STAGE[2]!.slot} alt={STAGE[2]!.alt} sizes="100vw" ratio="4 / 5" tone="dark" className="-mx-5 -mt-[4.5rem] mb-10 aspect-[4/3] sm:-mx-10 lg:hidden" />
          <h2 className="chapter-title" data-rise>One less thing on your mind</h2>
          <p className="chapter-text" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Your fabric is sorted weeks before the day. No last-minute rush to the market, no settling for your second choice
            because the first one ran out. Just the countdown.
          </p>
        </article>

        <article {...chapter(3)} className="chapter">
          <Media slot={STAGE[3]!.slot} alt={STAGE[3]!.alt} sizes="100vw" ratio="4 / 5" tone="dark" className="-mx-5 -mt-[4.5rem] mb-10 aspect-[4/3] sm:-mx-10 lg:hidden" />
          <h2 className="chapter-title" data-rise>Then the day is yours</h2>
          <p className="chapter-text" data-rise style={{ ["--rise-i" as string]: 1 }}>
            The photos you&rsquo;ll keep for twenty years. The compliments you pretend not to hear. The friend who leans over and
            asks, quietly, where you got it.
          </p>
          <p className="mt-10 text-lg font-bold" data-rise style={{ ["--rise-i" as string]: 2 }}>Finish the look</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" data-rise style={{ ["--rise-i" as string]: 2 }}>
            <Link to="/ready-to-wear" className="door">
              Ready-to-wear <ArrowRightIcon size={22} />
            </Link>
            <Link to="/lingerie" className="door">
              Lingerie <ArrowRightIcon size={22} />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Three ways in: two pictures and a door                               */
/* ------------------------------------------------------------------ */

function WaysIn({ byLine }: { byLine: Record<Line, CatalogueProduct[]> }) {
  const count = (l: Line) => byLine[l].filter((p) => !p.soldOut).length;
  const caption = (l: Line) => (
    <div className="mt-5 flex items-end justify-between gap-6">
      <div>
        <h3 className="way-title">{LINE_LABELS[l]}</h3>
        <p className="mt-2 max-w-[40ch] text-lg text-grey-100">{LINE_INTROS[l]}</p>
        <p className="mt-1 text-grey-300 tabular">
          {count(l)} {count(l) === 1 ? "piece" : "pieces"} in stock
        </p>
      </div>
      <ArrowRightIcon size={28} className="mb-2 shrink-0 transition-transform duration-(--duration-base) group-hover:translate-x-1" />
    </div>
  );
  return (
    <section aria-labelledby="ways-title" className="bg-ink text-paper">
      <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) py-24 md:py-32">
        <h2 id="ways-title" className="chapter-title" data-rise>What&rsquo;s the occasion?</h2>
        <div className="mt-12 grid gap-x-3 gap-y-12 md:grid-cols-12">
          <Link to={LINE_PATHS.fabric} className="group md:col-span-7" data-rise>
            <div className="overflow-hidden">
              <Media
                slot="campaign/line-fabrics"
                alt="Ivory corded lace, emerald sequin lace and gold damask laid side by side"
                sizes="(min-width: 768px) 56vw, 100vw"
                ratio="1 / 1"
                tone="dark"
                className="aspect-square w-full"
                imgClassName="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
              />
            </div>
            {caption("fabric")}
          </Link>
          <div className="flex flex-col gap-12 md:col-span-5">
            <Link to={LINE_PATHS.rtw} className="group" data-rise style={{ ["--rise-i" as string]: 1 }}>
              <div className="overflow-hidden">
                <Media
                  slot="campaign/line-rtw"
                  alt="A woman in a black wrap dress with a yellow sash"
                  sizes="(min-width: 768px) 40vw, 100vw"
                  ratio="1 / 1"
                  tone="dark"
                  className="aspect-square w-full"
                  imgClassName="object-top transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
                />
              </div>
              {caption("rtw")}
            </Link>
            <Link to={LINE_PATHS.lingerie} className="group flex min-h-40 flex-col justify-between bg-grey-800 p-7 transition-colors hover:bg-grey-700" data-rise style={{ ["--rise-i" as string]: 2 }}>
              <h3 className="way-title">{LINE_LABELS.lingerie}</h3>
              <div className="mt-6 flex items-end justify-between gap-6">
                <p className="text-lg text-grey-100">
                  {LINE_INTROS.lingerie}
                  <span className="mt-1 block text-grey-300 tabular">
                    {count("lingerie")} {count("lingerie") === 1 ? "piece" : "pieces"} in stock
                  </span>
                </p>
                <ArrowRightIcon size={28} className="shrink-0 transition-transform duration-(--duration-base) group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The season: one campaign photograph across the page                 */
/* ------------------------------------------------------------------ */

// [TBC: which season is current; the client lists her campaigns in the questionnaire (Q58).]
const SEASON = {
  title: "Wedding season",
  text: "The bride. Her friends in matching gele. The aunties who planned every detail. Everyone in the photo, looking like they belong in it.",
  to: "/fabrics",
  action: "Dress the whole party",
  desktop: "banners/campaign-wedding-desktop",
  phone: "banners/campaign-wedding-phone",
  alt: "Two friends in champagne lace setting a bride's ivory gele outdoors",
};

function Season() {
  return (
    <section aria-labelledby="season-title" className="bg-paper">
      <Media slot={SEASON.phone} alt={SEASON.alt} sizes="100vw" ratio="3 / 4" className="aspect-[3/4] w-full md:hidden" imgClassName="object-top" />
      <Media slot={SEASON.desktop} alt={SEASON.alt} sizes="100vw" ratio="8 / 3" className="hidden aspect-[8/3] w-full md:block" />
      <div className="mx-auto grid max-w-(--container-page) gap-8 px-(--spacing-gutter) py-14 md:grid-cols-12 md:items-end md:py-20">
        <h2 id="season-title" className="display-size md:col-span-6" data-rise>{SEASON.title}</h2>
        <div className="md:col-span-5 md:col-start-8" data-rise style={{ ["--rise-i" as string]: 1 }}>
          <p className="max-w-[36ch] text-lg">{SEASON.text}</p>
          <Link to={SEASON.to} className="link-arrow mt-6">
            {SEASON.action} <ArrowRightIcon size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The printed price sheet: live stock, like the list at the counter   */
/* ------------------------------------------------------------------ */

/** Scalloped edge drawn as a row of paper-coloured half circles. */
function Scallops({ flip = false }: { flip?: boolean }) {
  return (
    <svg aria-hidden="true" className={cx("block h-3 w-full text-paper", flip && "rotate-180")} preserveAspectRatio="none" viewBox="0 0 640 12">
      <defs>
        <pattern id={flip ? "scallop-b" : "scallop-t"} width="16" height="12" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="12" r="8" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="640" height="12" fill={`url(#${flip ? "scallop-b" : "scallop-t"})`} />
    </svg>
  );
}

function PriceSheet({ byLine }: { byLine: Record<Line, CatalogueProduct[]> }) {
  return (
    <section aria-labelledby="sheet-title" className="relative overflow-hidden bg-ink py-24 md:py-36">
      <Media slot="campaign/sheet-backdrop" alt="" sizes="100vw" ratio="16 / 9" tone="dark" className="absolute inset-0 size-full" imgClassName="opacity-90" />
      <div className="relative mx-[10px] sm:mx-auto sm:w-[min(640px,calc(100%-2*var(--spacing-gutter)))]" data-rise>
        <Scallops />
        <div className="bg-paper px-7 py-14 text-ink sm:px-16">
          <h2 id="sheet-title" className="chapter-title text-center">On the shelf today</h2>
          <p className="mt-3 text-center text-[15px] text-grey-600">Colours for the day, with what&rsquo;s left on each bolt right now.</p>
          {LINES.map((l) =>
            byLine[l].length ? (
              <div key={l} className="mt-14">
                <h3 className="text-center text-[24px] font-bold tracking-(--tracking-heading)">{LINE_LABELS[l]}</h3>
                <ul className="mx-auto mt-6 max-w-[420px] space-y-4">
                  {byLine[l].slice(0, 6).map((p) => {
                    const unit = p.variants[0]?.unit ?? "piece";
                    const left = p.variants.reduce((n, v) => n + v.available, 0);
                    return (
                      <li key={p.id} className="sheet-row">
                        <Link to={`/p/${p.slug}`} className="group flex items-baseline justify-between gap-6">
                          <span className="text-lg font-medium group-hover:underline group-hover:underline-offset-4">{p.title}</span>
                          <span className="tabular shrink-0 text-lg">
                            {formatMoney(p.fromPrice)}
                            <span className="text-grey-600"> / {unitLabel(unit, 1)}</span>
                          </span>
                        </Link>
                        <p className="text-[15px] text-grey-600">{p.soldOut ? "Sold out" : `${left} ${unitLabel(unit, left)} left`}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null,
          )}
          <p className="mt-14 text-center text-[15px] text-grey-600">
            Shop open [TBC: days]
            <br />
            [TBC: opening hours]
          </p>
        </div>
        <Scallops flip />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Your cut: the live tape writes the cutting slip                     */
/* ------------------------------------------------------------------ */

function YourCut({ fabrics, zones }: { fabrics: CatalogueProduct[]; zones: { name: string; fee: { amount: number; currency: "NGN" | "USD" }; eta: string }[] }) {
  const choices = useMemo(() => fabrics.filter((p) => !p.soldOut).slice(0, 4), [fabrics]);
  const [pick, setPick] = useState(0);
  const product = choices[pick];
  const variant = product?.variants.find((v) => v.available > 0);
  const [yards, setYards] = useState(5);
  const [added, setAdded] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const bag = useBag();
  if (!product || !variant) return null;
  const qty = Math.min(yards, Math.min(variant.available, 30));
  const total = multiply(variant.price, qty);
  const unit = variant.unit;

  return (
    <section id="your-cut" aria-labelledby="cut-title" className="bg-grey-100">
      <div className="mx-auto grid max-w-(--container-page) gap-12 px-(--spacing-gutter) py-24 lg:grid-cols-12 md:py-36">
        <div className="lg:col-span-5">
          <h2 id="cut-title" className="display-size" data-rise>
            Plan your look
          </h2>
          <p className="mt-6 max-w-[30ch] text-lg" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Pick the fabric, set the yards your tailor gave you and see what it comes to. No surprises later.
          </p>
          <div className="mt-12" data-rise style={{ ["--rise-i" as string]: 2 }}>
            <YardTape
              value={qty}
              onChange={(n) => {
                setYards(n);
                setAdded(false);
              }}
              available={variant.available}
              unit={unit}
              unitPrice={variant.price}
            />
          </div>
          <fieldset className="mt-12" data-rise style={{ ["--rise-i" as string]: 3 }}>
            <legend className="text-[15px] font-semibold">Fabric</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {choices.map((p, i) => (
                <label key={p.id} className={cx("chip", i === pick && "is-on")}>
                  <input
                    type="radio"
                    name="cut-fabric"
                    className="sr-only"
                    checked={i === pick}
                    onChange={() => {
                      setPick(i);
                      setAdded(false);
                    }}
                  />
                  {p.title}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:flex lg:flex-col lg:items-end" data-rise style={{ ["--rise-i" as string]: 1 }}>
          <div className="slip mx-auto w-full max-w-[480px] lg:mx-0 bg-paper px-7 pb-14 pt-9 text-lg" aria-live="polite">
            <p className="text-[15px] text-grey-600">Harries Vogue · Abule Egba, Lagos</p>
            <h3 className="mt-6 text-lg font-bold">Your fabric</h3>
            <p key={`f-${product.id}`} className="slip-row flash"><span>{product.title}</span><i /><span className="tabular">{variantLabel(variant)}</span></p>
            <p className="slip-row"><span>Price per {unitLabel(unit, 1)}</span><i /><span className="tabular">{formatMoney(variant.price)}</span></p>
            <p className="slip-row"><span>{unit === "yard" ? "Yards" : "Quantity"}</span><i /><span key={qty} className="tabular tick">{qty}</span></p>
            <h3 className="mt-7 text-lg font-bold">At the counter</h3>
            <p className="slip-row"><span>Measured and cut</span><i /><span>to your {unitLabel(unit, 2)}</span></p>
            <p className="slip-row"><span>Folded and packed</span><i /><span>[TBC]</span></p>
            <h3 className="mt-7 text-lg font-bold">Delivery</h3>
            {zones.map((z) => (
              <p key={z.name} className="slip-row">
                <span>{z.name}</span>
                <i />
                <span className="tabular">{z.fee.amount ? formatMoney(z.fee) : "[TBC]"}</span>
              </p>
            ))}
            <p className="mt-7 flex items-center justify-between gap-4 bg-ink px-4 py-3 font-bold text-paper">
              <span>
                Total for {qty} {unitLabel(unit, qty)}
              </span>
              <span key={total.amount} className="tabular tick">{formatMoney(total)}</span>
            </p>
          </div>
          <div className="mx-auto mt-8 flex max-w-[480px] flex-wrap lg:mr-0 items-center gap-x-6 gap-y-3">
            <Button
              ref={addRef}
              variant="ink"
              className={cx("add-btn", added && "is-added")}
              onClick={() => {
                void flyToBag(addRef.current);
                bag.add(
                  {
                    variantId: variant.id,
                    productId: product.id,
                    slug: product.slug,
                    title: product.title,
                    variantLabel: variantLabel(variant),
                    unit,
                    unitPrice: variant.price,
                    max: variant.available,
                    ...(product.images[0] ? { image: product.images[0] } : {}),
                  },
                  qty,
                );
                setAdded(true);
              }}
            >
              {added ? <><span className="add-check" aria-hidden="true" />Added {qty} {unitLabel(unit, qty)}</> : "Add this cut to bag"}
            </Button>
            <Link to={`/p/${product.slug}`} className="link-quiet">See the fabric</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The shop, and buying questions                                      */
/* ------------------------------------------------------------------ */

function TheShop() {
  return (
    <section aria-labelledby="shop-title" className="bg-paper">
      <div className="mx-auto grid max-w-(--container-page) gap-12 px-(--spacing-gutter) py-24 md:grid-cols-12 md:items-center md:py-32">
        <Media
          slot="banners/line-fabrics-banner"
          alt="A woman in a black lace dress and yellow gele unrolling wine sequin lace across the shop counter"
          sizes="(min-width: 768px) 45vw, 100vw"
          ratio="4 / 5"
          className="aspect-[4/5] w-full overflow-hidden md:col-span-6"
          imgClassName="object-[70%_50%] reveal-img"
        />
        <div className="md:col-span-5 md:col-start-8">
        <h2 id="shop-title" className="chapter-title" data-rise>Come and feel it</h2>
        <div className="mt-8 space-y-6 text-lg leading-[1.6]" data-rise style={{ ["--rise-i" as string]: 1 }}>
          <p>Some fabric you have to touch. Come to the shop in Abule Egba, hold it up in the light, see how it falls, and decide.</p>
          <p>
            Can&rsquo;t make it across Lagos? Order here and it comes to you.{" "}
            <mark className="bg-yellow px-1 text-ink">[TBC: address, nearest landmark and opening hours]</mark>
          </p>
          <p>[TBC: two or three sentences from the owner on how Harries Vogue started and what it stands for.]</p>
        </div>
        <p className="mt-10 text-[24px] font-bold tracking-(--tracking-heading)" data-rise style={{ ["--rise-i" as string]: 2 }}>Harries Vogue</p>
        <p className="text-[15px] text-grey-600">[TBC: WhatsApp number] · [TBC: email]</p>
        </div>
      </div>
    </section>
  );
}

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="faq group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
        {q}
        <span aria-hidden="true" className="faq-chevron" />
      </summary>
      <div className="mt-3 max-w-[48ch] text-lg text-grey-200">{children}</div>
    </details>
  );
}

function Buying({ zones }: { zones: { name: string; fee: { amount: number; currency: "NGN" | "USD" }; eta: string }[] }) {
  return (
    <section aria-labelledby="buying-title" className="relative bg-ink text-paper">
      <div className="mx-auto grid max-w-(--container-page) gap-14 px-(--spacing-gutter) pb-24 pt-24 md:grid-cols-12 md:pb-36 md:pt-0">
        <div className="md:col-span-5 md:pt-36">
          <h2 id="buying-title" className="chapter-title" data-rise>Nothing to worry about</h2>
          <ul className="mt-8 space-y-2 text-lg" data-rise style={{ ["--rise-i" as string]: 1 }}>
            <li>Your card stays private with Paystack</li>
            <li>Delivery to {zones.map((z) => z.name).join(" and ")}</li>
            <li>Know where your order is with its number and your email</li>
          </ul>
          <div className="mt-12 space-y-7" data-rise style={{ ["--rise-i" as string]: 2 }}>
            <Question q="How do I pay?">At checkout you pay through Paystack. We never see or store your card details.</Question>
            <Question q="What if only a few yards are left?">
              Each fabric shows exactly how many yards are left. When you start paying, your yards are held for 15 minutes so
              nobody else can buy them.
            </Question>
            <Question q="What does delivery cost?">
              {zones.map((z) => (
                <span key={z.name} className="block">
                  {z.name}: {z.fee.amount ? formatMoney(z.fee) : "[TBC]"}, {z.eta}
                </span>
              ))}
            </Question>
            <Question q="Can I return fabric that's been cut?">
              [TBC: returns policy for cut fabric] <Link to="/policies/returns" className="underline underline-offset-4">Returns policy</Link>
            </Question>
            <Question q="How do I track my order?">
              Use your order number and email on the <Link to="/track" className="underline underline-offset-4">tracking page</Link>.
            </Question>
            <Question q="Can I see the fabric first?">[TBC: visiting the shop: address and hours]</Question>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4" data-rise style={{ ["--rise-i" as string]: 3 }}>
            <ButtonLink to="/track" variant="paper">Track an order</ButtonLink>
            <Link to="/policies/delivery" className="link-quiet text-paper">Delivery policy</Link>
          </div>
        </div>
        <div className="relative md:col-span-6 md:col-start-7">
          <Media
            slot="campaign/buy-parcel"
            alt="Emerald silk satin folded in black tissue and tied with a yellow ribbon"
            sizes="(min-width: 768px) 46vw, 100vw"
            ratio="3 / 4"
            tone="dark"
            className="aspect-[4/5] w-full md:aspect-[3/4] md:-mt-0"
          />
          <Media
            slot="campaign/buy-handoff"
            alt="One pair of hands passing a black shopping bag to another"
            sizes="(min-width: 768px) 16vw, 38vw"
            ratio="1 / 1"
            className="absolute -bottom-6 right-4 aspect-square w-[38%] md:-bottom-10 md:-left-10 md:right-auto md:w-1/3"
          />
        </div>
      </div>
    </section>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { byLine, zones } = loaderData;
  const fabrics = byLine.fabric;
  return (
    <>
      <Cover />
      <Selvedge />
      <Counter />
      <Season />
      <WaysIn byLine={byLine} />
      <PriceSheet byLine={byLine} />
      <YourCut fabrics={fabrics} zones={zones} />
      <TheShop />
      <Buying zones={zones} />
    </>
  );
}
