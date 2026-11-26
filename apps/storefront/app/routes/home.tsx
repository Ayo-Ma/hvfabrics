import { Link } from "react-router";
import { LINES, type CatalogueProduct, type Line } from "@hv/core";
import { ArrowRightIcon, BoxIcon, GlobeIcon, MapPinIcon, ZoomInIcon, WhatsappIcon, MailIcon, cx } from "@hv/ui";
import type { Route } from "./+types/home";
import { getCatalogue, getSettings } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { ButtonLink } from "~/components/Button";
import { Media, hasMedia } from "~/components/Media";
import { ProductCard } from "~/components/ProductCard";
import { SHOP, SHOP_CITIES } from "~/lib/shop";

/*
 * Home (owner's copy and section map, 2026-11-26): a global wholesale and retail house for fabric,
 * Ankara and ready-to-wear. The house language stays: Futura capitals, the selvedge as the one
 * ornament, ink and paper grounds with yellow for the primary action only. Local details (hours,
 * delivery by city) sit in the footer and the policies, so the top of the page reads global.
 * Photographs: each slot names the generated image it is waiting for (assets/GENERATION_PROMPTS.md,
 * "Homepage 2026-11") and shows an existing photograph until that one exists.
 */

export function meta() {
  return [
    { title: "Harries Vogue · Curated fabrics, bold Ankara and ready-to-wear, delivered worldwide" },
    {
      name: "description",
      content:
        "Fabrics, Ankara prints and ready-to-wear from Harries Vogue, by the yard or wholesale. Showrooms in Ilorin and Abeokuta, delivery across Nigeria, shipping abroad by arrangement.",
    },
    { property: "og:title", content: "Harries Vogue" },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const [catalogue, settings] = await Promise.all([getCatalogue(env), getSettings(env)]);
  // Fresh on the shelf: what can be bought now, newest first; sold-out pieces never lead the page.
  const fresh = catalogue.products
    .filter((p) => !p.soldOut)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return { fresh, transfer: settings.payment === "transfer" };
}

/* ------------------------------------------------------------------ */
/* 1. The hero                                                          */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section aria-labelledby="home-title" className="relative bg-paper lg:grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12">
      <div className="relative lg:order-2 lg:col-span-6">
        <Media
          slot="home/hero"
          fallback="campaign/stage-02-bolt"
          alt="Stacked bolts of colourful fabric on the shelves of the Harries Vogue showroom"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          ratio="4 / 5"
          className="cover-photo h-[44svh] w-full overflow-hidden sm:h-[60svh] lg:absolute lg:inset-0 lg:h-full"
          imgClassName="object-[50%_40%]"
        />
      </div>
      <div className="flex flex-col justify-center px-(--spacing-gutter) pb-14 pt-9 lg:order-1 lg:col-span-6 lg:py-20 lg:pl-[max(2.5rem,calc((100vw-80rem)/2+var(--spacing-gutter)))] lg:pr-14">
        <h1 id="home-title" className="hero-title">
          <span className="cover-line"><span>Curated fabrics, bold Ankara, and ready-to-wear fashion</span></span>
          <span className="cover-line hero-title-tail"><span style={{ animationDelay: "120ms" }}>delivered worldwide.</span></span>
        </h1>
        <p className="cover-fade mt-7 max-w-[46ch] text-lg leading-relaxed">
          Whether you are stocking your boutique, cutting a new fashion collection, or dressing for a moment that matters, we source
          textiles with unforgettable drape, rich colour, and lasting quality.
        </p>
        <div className="cover-fade mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "380ms" }}>
          <ButtonLink to="/#collections" className="min-h-14 px-8">Shop all collections</ButtonLink>
          <ButtonLink to="/#wholesale" variant="ink" className="min-h-14 px-8">Wholesale inquiries</ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** The fabric's printed edge: the shop's name along the selvedge, the page's one ornament. */
function Selvedge() {
  return <div aria-hidden="true" className="selvedge" />;
}

/* ------------------------------------------------------------------ */
/* 2. Shop by category: the three pillars                               */
/* ------------------------------------------------------------------ */

const PILLARS: Record<Line, { slot: string; fallback?: string; alt: string; action: string }> = {
  fabric: {
    slot: "home/category-fabrics",
    fallback: "campaign/line-fabrics",
    alt: "Folds of fluid chiffon, textured jacquard and corduroy laid side by side",
    action: "Explore fabrics",
  },
  ankara: {
    slot: "home/category-ankara",
    alt: "Bolts of bright Ankara wax print stacked on a cutting table",
    action: "Shop Ankara",
  },
  rtw: {
    slot: "home/category-rtw",
    fallback: "campaign/line-rtw",
    alt: "A woman in a tailored ready-to-wear dress cut from Harries Vogue fabric",
    action: "Browse ready-to-wear",
  },
};

function Pillar({ line, big = false, i }: { line: Line; big?: boolean; i: number }) {
  const p = PILLARS[line];
  const photo = hasMedia(p.slot) || (p.fallback !== undefined && hasMedia(p.fallback));
  return (
    <Link to={LINE_PATHS[line]} className={cx("pillar group", big && "is-big")} data-rise style={{ ["--rise-i" as string]: i }}>
      {photo ? (
        <div className="pillar-photo">
          <Media
            slot={p.slot}
            {...(p.fallback ? { fallback: p.fallback } : {})}
            alt={p.alt}
            sizes={big ? "(min-width: 1024px) 56vw, 100vw" : "(min-width: 1024px) 40vw, 100vw"}
            ratio={big ? "4 / 5" : "16 / 10"}
            tone="dark"
            className="size-full"
            imgClassName="pillar-img"
          />
        </div>
      ) : (
        // No photograph yet: the line's name set large as a printed swatch card, never a grey box.
        <div aria-hidden="true" className="pillar-swatch">
          <span>{LINE_LABELS[line]}</span>
          <span>{LINE_LABELS[line]}</span>
          <span>{LINE_LABELS[line]}</span>
        </div>
      )}
      <div className="pillar-copy">
        <h3 className="way-title">{line === "fabric" ? "Premium fabrics" : line === "ankara" ? "Authentic Ankara" : "Ready-to-wear"}</h3>
        <p className="mt-3 max-w-[42ch] text-lg text-grey-100">{LINE_INTROS[line]}</p>
        <span className="link-arrow mt-5">
          {p.action} <ArrowRightIcon size={20} />
        </span>
      </div>
    </Link>
  );
}

function Pillars() {
  return (
    <section id="collections" aria-labelledby="pillars-title" className="scroll-mt-24 bg-ink text-paper">
      <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) py-24 md:py-32">
        <h2 id="pillars-title" className="chapter-title max-w-[16ch]" data-rise>Everything you need to create and wear</h2>
        <div className="pillars mt-14">
          <Pillar line="fabric" big i={0} />
          <Pillar line="ankara" i={1} />
          <Pillar line="rtw" i={2} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The wholesale and global advantage                                */
/* ------------------------------------------------------------------ */

const ADVANTAGES = [
  {
    Icon: ZoomInIcon,
    title: "Curated quality, zero guesswork",
    text: "Every fabric is hand-inspected for weave strength, true colour, and feel before it reaches our shelves.",
  },
  {
    Icon: BoxIcon,
    title: "Built for bulk & single orders",
    text: "Order a few yards for a custom outfit or stock up on full bales and bundles at competitive wholesale rates.",
  },
  {
    Icon: GlobeIcon,
    title: "Delivery worldwide",
    text: `From Lagos and Abuja to London, Houston, and beyond. Orders paid before ${SHOP.sameDayCutoff} WAT dispatch the very same day. Abroad? Message us before you order and we arrange it.`,
  },
  {
    Icon: MapPinIcon,
    title: "Real stores, real people",
    text: `Shop online with confidence or visit our showrooms in ${SHOP_CITIES}.`,
  },
];

function Advantage() {
  return (
    <section aria-labelledby="advantage-title" className="bg-paper">
      <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) py-20 md:py-28">
        <h2 id="advantage-title" className="sr-only">The wholesale and global advantage</h2>
        <ol className="advantages">
          {ADVANTAGES.map((a, i) => (
            <li key={a.title} className="advantage" data-rise style={{ ["--rise-i" as string]: i }}>
              <span className="advantage-num tabular" aria-hidden="true">0{i + 1}</span>
              <a.Icon size={28} className="mt-8" />
              <h3 className="mt-4 text-xl font-bold leading-snug">{a.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-grey-700">{a.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Fresh on the shelf                                               */
/* ------------------------------------------------------------------ */

function Fresh({ products }: { products: CatalogueProduct[] }) {
  return (
    <section aria-labelledby="fresh-title" className="bg-grey-50">
      <div className="mx-auto max-w-(--container-page) px-(--spacing-gutter) py-24 md:py-32">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h2 id="fresh-title" className="chapter-title md:col-span-7" data-rise>New arrivals &amp; bestsellers</h2>
          <p className="max-w-[44ch] text-lg md:col-span-5" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Hand-picked textures and colours ready to ship today. Available per yard, per 6-yard piece, or in wholesale bundles.
          </p>
        </div>
        {products.length ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <li key={p.id} data-rise style={{ ["--rise-i" as string]: i % 4 }}>
                <ProductCard product={p} quickAdd priority={i < 2} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-lg">New pieces are being added to the shelf. Visit our showrooms in {SHOP_CITIES} in the meantime.</p>
        )}
        <div className="mt-14 flex flex-wrap gap-x-8 gap-y-4">
          {LINES.map((l) => (
            <Link key={l} to={LINE_PATHS[l]} className="link-arrow">
              All {l === "ankara" ? "Ankara" : LINE_LABELS[l].toLowerCase()} <ArrowRightIcon size={20} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. The emotional story                                              */
/* ------------------------------------------------------------------ */

function Standard() {
  return (
    <section aria-labelledby="standard-title" className="bg-paper lg:grid lg:grid-cols-2">
      <Media
        slot="home/story-hands"
        fallback="campaign/stage-03-yard"
        alt="Close-up of hands feeling the weave of a fabric before it goes on the shelf"
        sizes="(min-width: 1024px) 50vw, 100vw"
        ratio="4 / 5"
        tone="dark"
        className="aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[90svh]"
        imgClassName="reveal-img"
      />
      <div className="flex flex-col justify-center px-(--spacing-gutter) py-20 lg:px-16 lg:py-28 xl:pr-[max(4rem,calc((100vw-80rem)/2+var(--spacing-gutter)))]">
        <p className="eyebrow" data-rise>The Harries Vogue standard</p>
        <h2 id="standard-title" className="chapter-title mt-5 max-w-[18ch]" data-rise style={{ ["--rise-i" as string]: 1 }}>
          Great fashion starts long before the first stitch.
        </h2>
        <div className="mt-8 max-w-[56ch] space-y-5 text-lg leading-[1.65]" data-rise style={{ ["--rise-i" as string]: 2 }}>
          <p>Anyone who works with fabric knows the disappointment of material that looks good in a photo but feels stiff, thin, or dull in your hands.</p>
          <p>
            At Harries Vogue, we do the hard sourcing for you. We travel, test, and curate only the chiffons, corduroys, Ankara prints, and
            ready-to-wear staples that meet our standard for movement, durability, and richness. Whether you are a fashion brand owner
            building your next drop or a woman stepping into a room, our fabrics make sure your work speaks before you say a word.
          </p>
        </div>
        <div className="mt-10" data-rise style={{ ["--rise-i" as string]: 3 }}>
          <ButtonLink to="/#wholesale" variant="ink" className="min-h-14 px-8">Partner with us for wholesale</ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Wholesale and bulk concierge                                     */
/* ------------------------------------------------------------------ */

const WHOLESALE_MESSAGE = "Hello Harries Vogue, I'd like a wholesale quote. Fabrics/textures: … Quantities: … Delivery city or country: …";

function Wholesale() {
  return (
    <section id="wholesale" aria-labelledby="wholesale-title" className="relative isolate scroll-mt-24 overflow-hidden bg-ink text-paper">
      <Media
        slot="home/wholesale-texture"
        fallback="campaign/sheet-backdrop"
        alt=""
        sizes="100vw"
        ratio="16 / 9"
        tone="dark"
        className="absolute inset-0 -z-10 size-full"
        imgClassName="brightness-[0.45]"
      />
      <div className="mx-auto grid max-w-(--container-page) gap-10 px-(--spacing-gutter) py-28 md:grid-cols-12 md:py-40">
        <h2 id="wholesale-title" className="display-size md:col-span-7" data-rise>Stocking a boutique or producing a collection?</h2>
        <div className="md:col-span-5 md:self-end" data-rise style={{ ["--rise-i" as string]: 1 }}>
          <p className="text-lg leading-relaxed">
            Unlock tiered wholesale pricing, priority access to new bales, and dedicated sourcing support on WhatsApp or email. Tell us the
            quantities and textures you need, and we will put a custom quote together within hours.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href={`${SHOP.whatsapp}?text=${encodeURIComponent(WHOLESALE_MESSAGE)}`} target="_blank" rel="noopener" className="transfer-wa min-h-14 px-7">
              <WhatsappIcon size={20} /> Chat with our wholesale team
            </a>
            <a href={`mailto:${SHOP.email}?subject=${encodeURIComponent("Wholesale quote")}`} className="inline-flex items-center gap-2 font-semibold underline underline-offset-[6px]">
              <MailIcon size={18} /> Email us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Questions: every buying question answered on the site, not on WhatsApp */
/* ------------------------------------------------------------------ */

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="faq group border-b border-grey-200 py-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
        {q}
        <span aria-hidden="true" className="faq-chevron" />
      </summary>
      <div className="mt-3 max-w-[60ch] text-lg text-grey-700">{children}</div>
    </details>
  );
}

function Questions({ transfer }: { transfer: boolean }) {
  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-24 bg-paper">
      <div className="mx-auto grid max-w-(--container-page) gap-12 px-(--spacing-gutter) py-24 md:grid-cols-12 md:py-32">
        <div className="md:col-span-4">
          <h2 id="questions-title" className="chapter-title" data-rise>Questions, answered</h2>
          <p className="mt-5 max-w-[30ch] text-lg" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Everything about paying, delivery and returns is here, so you never have to wait for a reply.
          </p>
        </div>
        <div className="md:col-span-7 md:col-start-6" data-rise style={{ ["--rise-i" as string]: 2 }}>
          <Question q="How do I pay?">
            {transfer
              ? "Place your order, then transfer the total to the shop account shown on your order page and send the receipt on WhatsApp. We confirm it during shop hours and get your order ready."
              : "At checkout you pay through Paystack. We never see or store your card details."}
          </Question>
          <Question q="Will my order be kept for me?">
            {transfer
              ? "Yes. When you place your order, your items are held for 24 hours while you transfer, so nobody else can buy them."
              : "Yes. When you start paying, your items are held for 15 minutes so nobody else can buy them."}
          </Question>
          <Question q="How much fabric can I order?">
            From 2 yards up, cut to the exact yards you order. Buying for a boutique or a collection?{" "}
            <Link to="/#wholesale" className="underline underline-offset-4">Ask for a wholesale quote</Link>.
          </Question>
          <Question q="What does delivery cost, and when does it go out?">
            The fee for your city is shown at checkout, and collecting from our showroom in {SHOP_CITIES} is free. Orders paid before{" "}
            {SHOP.sameDayCutoff} go out the same day. <Link to="/policies/delivery" className="underline underline-offset-4">Delivery rates and details</Link>
          </Question>
          <Question q="Do you deliver abroad?">
            Yes. Message us on{" "}
            <a className="underline underline-offset-4" href={SHOP.whatsapp} rel="noopener" target="_blank">WhatsApp</a> before you order and
            we&rsquo;ll arrange it.
          </Question>
          <Question q="Can I return fabric that's been cut?">
            No. Once fabric is cut to your yards it&rsquo;s yours, so we don&rsquo;t take returns or exchanges. If we send the wrong item, we&rsquo;ll
            put it right. <Link to="/policies/returns" className="underline underline-offset-4">Returns policy</Link>
          </Question>
          <Question q="How do I track my order?">
            Use your order number and email on the <Link to="/track" className="underline underline-offset-4">tracking page</Link>.
          </Question>
          <Question q="Can I see the fabric first?">
            Yes. Visit us at {SHOP.shops.map((s) => s.address).join(" or ")}, open {SHOP.hours}. You can also collect your order there.
          </Question>
        </div>
      </div>
    </section>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { fresh, transfer } = loaderData;
  return (
    <>
      <Hero />
      <Selvedge />
      <Pillars />
      <Advantage />
      <Fresh products={fresh} />
      <Standard />
      <Wholesale />
      <Questions transfer={transfer} />
    </>
  );
}
