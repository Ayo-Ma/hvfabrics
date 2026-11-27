import { useMemo, useState } from "react";
import { Link } from "react-router";
import { LINES, type CatalogueProduct, type Line } from "@hv/core";
import { ArrowRightIcon, BoxIcon, GlobeIcon, MailIcon, MapPinIcon, WhatsappIcon, ZoomInIcon } from "@hv/ui";
import type { Route } from "./+types/home";
import { getCatalogue, getSettings } from "~/lib/catalogue.server";
import { LINE_INTROS, LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { ButtonLink } from "~/components/Button";
import { Media, hasMedia } from "~/components/Media";
import { Monogram } from "~/components/Logo";
import { ProductCard } from "~/components/ProductCard";
import { SHOP, SHOP_CITIES } from "~/lib/shop";

/*
 * Home (owner's copy, 2026-11-26; layout after the drop.code, OMÉ and Ameya references the owner chose):
 * a soft grey hero panel with one big sentence-case headline, the shop's seal on its edge; arched
 * doors into each line; new arrivals as grey tiles with pill tabs; the promise as a photo panel;
 * a wholesale panel; questions answered on the site. White pages, ink type, yellow only for the
 * primary action and the selected tab. Photographs wait for the generated set in
 * assets/GENERATION_PROMPTS.md section 1A and show an existing photograph until then.
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
  // What can be bought now, newest first; sold-out pieces never lead the page.
  const fresh = catalogue.products.filter((p) => !p.soldOut).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { fresh: fresh.slice(0, 24), transfer: settings.payment === "transfer" };
}

/* ---------------- 1. Hero ---------------- */

function Seal() {
  // The shop's name set round the monogram, like a woven label. Decorative: the page says it in words.
  return (
    <div className="seal" aria-hidden="true">
      <svg className="seal-ring" viewBox="0 0 100 100">
        <defs>
          <path id="seal-path" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text fontSize="9.2" fontWeight="700" letterSpacing="2.1" fill="currentColor">
          <textPath href="#seal-path">HARRIES VOGUE · ILORIN · ABEOKUTA ·</textPath>
        </text>
      </svg>
      <Monogram className="seal-mark block" />
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="home-title" className="home-wrap pt-4 lg:pt-6">
      <div className="hero">
        <div className="hero-copy">
          <h1 id="home-title" className="hero-h1">
            <span className="cover-line"><span>Curated fabrics, bold Ankara, and ready-to-wear fashion</span></span>
            <span className="cover-line text-grey-500"><span style={{ animationDelay: "120ms" }}>delivered worldwide.</span></span>
          </h1>
          <p className="hero-sub cover-fade">
            <span aria-hidden="true" className="hero-spark" />
            <span>
              Whether you are stocking your boutique, cutting a new fashion collection, or dressing for a moment that matters, we source
              textiles with unforgettable drape, rich colour, and lasting quality.
            </span>
          </p>
          <div className="cover-fade mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "380ms" }}>
            <ButtonLink to="/#collections" className="min-h-14 px-8">Shop all collections</ButtonLink>
            <ButtonLink to="/#wholesale" variant="ink" className="min-h-14 px-8">Wholesale inquiries</ButtonLink>
          </div>
        </div>
        <div className="hero-photo">
          <Media
            slot="home/hero"
            fallback="campaign/stage-02-bolt"
            alt="Ankara prints stacked on showroom shelves, sheer ivory chiffon lifting in the light and a black ready-to-wear dress on a form"
            sizes="(min-width: 1024px) 48vw, 100vw"
            priority
            ratio="4 / 5"
            className="cover-photo"
            imgClassName="object-[50%_45%]"
          />
        </div>
      </div>
      <Seal />
    </section>
  );
}

/* ---------------- 2. Shop by category: arched doors ---------------- */

type Door = { to: string; label: string; text: string; slot?: string; fallback?: string; alt: string; line?: Line; focus?: string };

const DOORS: Door[] = [
  {
    to: LINE_PATHS.fabric,
    label: "Premium fabrics",
    text: LINE_INTROS.fabric,
    slot: "home/category-fabrics",
    fallback: "campaign/line-fabrics",
    alt: "Folds of fluid chiffon, textured jacquard and corduroy laid side by side",
  },
  { to: LINE_PATHS.ankara, label: "Authentic Ankara", text: LINE_INTROS.ankara, slot: "home/category-ankara", alt: "Stacks of bright Ankara wax print on a cutting table", line: "ankara" },
  {
    to: LINE_PATHS.rtw,
    label: "Ready-to-wear",
    text: LINE_INTROS.rtw,
    slot: "home/category-rtw",
    fallback: "campaign/line-rtw",
    alt: "A woman walking in a tailored emerald satin wrap top and wide-leg trousers",
    // She walks on the right of a landscape photo: keep her inside the arch.
    focus: "object-[68%_50%]",
  },
  {
    to: "/#wholesale",
    label: "Wholesale bundles",
    text: "Full bales and bundles at wholesale rates for boutiques, brands and tailors.",
    slot: "home/wholesale-texture",
    fallback: "campaign/sheet-backdrop",
    alt: "Rows of rolled fabric bales on tall racks in the warehouse",
  },
];

function Doors() {
  return (
    <section id="collections" aria-labelledby="doors-title" className="home-wrap sec scroll-mt-28">
      <div className="text-center">
        <h2 id="doors-title" className="sec-title mx-auto max-w-[18ch]" data-rise>Everything you need to create and wear</h2>
      </div>
      <ul className="arches mt-12">
        {DOORS.map((d, i) => {
          const photo = (d.slot && hasMedia(d.slot)) || (d.fallback && hasMedia(d.fallback));
          return (
            <li key={d.label} data-rise style={{ ["--rise-i" as string]: i }}>
              <Link to={d.to} className="arch group block">
                <div className="arch-frame">
                  {photo && d.slot ? (
                    <Media slot={d.slot} {...(d.fallback ? { fallback: d.fallback } : {})} {...(d.focus ? { imgClassName: d.focus } : {})} alt={d.alt} sizes="(min-width: 1024px) 24vw, 50vw" ratio="3 / 4" />
                  ) : (
                    // No photograph yet: the name set as a printed swatch, never a grey box.
                    <div className="arch-type" aria-hidden="true">
                      <span>{d.line ? LINE_LABELS[d.line] : d.label}</span>
                      <span>{d.line ? LINE_LABELS[d.line] : d.label}</span>
                      <span>{d.line ? LINE_LABELS[d.line] : d.label}</span>
                    </div>
                  )}
                </div>
                <span className="arch-label">
                  {d.label} <ArrowRightIcon size={20} />
                </span>
                <p className="arch-text">{d.text}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- 3. New arrivals, with pill tabs ---------------- */

type Tab = "all" | Line;

function Fresh({ products }: { products: CatalogueProduct[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const tabs: { id: Tab; label: string }[] = [{ id: "all", label: "All" }, ...LINES.filter((l) => products.some((p) => p.line === l)).map((l) => ({ id: l as Tab, label: LINE_LABELS[l] }))];
  const shown = useMemo(() => (tab === "all" ? products : products.filter((p) => p.line === tab)).slice(0, 8), [products, tab]);
  const more = tab === "all" ? LINE_PATHS.fabric : LINE_PATHS[tab];
  return (
    <section aria-labelledby="fresh-title" className="home-wrap sec pt-0">
      <div className="sec-head">
        <div>
          <h2 id="fresh-title" className="sec-title" data-rise>New arrivals &amp; bestsellers</h2>
          <p className="sec-lead mt-3">Hand-picked textures and colours ready to ship today. Available per yard, per 6-yard piece, or in wholesale bundles.</p>
        </div>
        <Link to={more} className="link-arrow shrink-0 text-base">
          Show more <ArrowRightIcon size={18} />
        </Link>
      </div>
      {tabs.length > 2 ? (
        <div role="tablist" aria-label="Show" className="pills mt-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`fresh-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="fresh-panel"
              tabIndex={tab === t.id ? 0 : -1}
              className="pill"
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                const i = tabs.findIndex((x) => x.id === tab);
                const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = tabs[(i + step + tabs.length) % tabs.length]!;
                setTab(next.id);
                document.getElementById(`fresh-tab-${next.id}`)?.focus();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
      <div id="fresh-panel" role={tabs.length > 2 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 2 ? `fresh-tab-${tab}` : undefined}>
        {shown.length ? (
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
            {shown.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} quickAdd priority={i < 2} sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-lg">New pieces are being added. Visit our showrooms in {SHOP_CITIES} in the meantime.</p>
        )}
      </div>
    </section>
  );
}

/* ---------------- 4. The wholesale and global advantage ---------------- */

const ADVANTAGES = [
  { Icon: ZoomInIcon, title: "Curated quality, zero guesswork", text: "Every fabric is hand-inspected for weave strength, true colour, and feel before it reaches our shelves." },
  { Icon: BoxIcon, title: "Built for bulk & single orders", text: "Order a few yards for a custom outfit or stock up on full bales and bundles at competitive wholesale rates." },
  {
    Icon: GlobeIcon,
    title: "Delivery worldwide",
    text: `From Lagos and Abuja to London, Houston, and beyond. Orders paid before ${SHOP.sameDayCutoff} WAT dispatch the very same day. Abroad? Message us before you order and we arrange it.`,
  },
  { Icon: MapPinIcon, title: "Real stores, real people", text: `Shop online with confidence or visit our showrooms in ${SHOP_CITIES}.` },
];

function Advantage() {
  return (
    <section aria-labelledby="advantage-title" className="home-wrap sec pt-0">
      <h2 id="advantage-title" className="sr-only">The wholesale and global advantage</h2>
      <ul className="adv">
        {ADVANTAGES.map((a, i) => (
          <li key={a.title} className="adv-item" data-rise style={{ ["--rise-i" as string]: i }}>
            <span className="adv-icon"><a.Icon size={22} /></span>
            <h3 className="mt-6 text-lg font-bold leading-snug tracking-[-0.01em]">{a.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-grey-700">{a.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- 5. The promise ---------------- */

function PromisePanel() {
  return (
    <section aria-labelledby="standard-title" className="home-wrap sec pt-0">
      <div className="promise" data-rise>
        <div className="promise-photo">
          <Media
            slot="home/story-hands"
            fallback="campaign/stage-03-yard"
            alt="Close-up of hands feeling the weave of a fabric before it goes on the shelf"
            sizes="(min-width: 1024px) 46vw, 100vw"
            ratio="4 / 5"
            tone="dark"
          />
        </div>
        <div className="promise-copy">
          <p className="eyebrow">The Harries Vogue standard</p>
          <h2 id="standard-title" className="sec-title mt-4 max-w-[16ch]">Great fashion starts long before the first stitch.</h2>
          <div className="mt-7 max-w-[54ch] space-y-4 text-[1.0625rem] leading-[1.7] text-grey-200">
            <p>Anyone who works with fabric knows the disappointment of material that looks good in a photo but feels stiff, thin, or dull in your hands.</p>
            <p>
              At Harries Vogue, we do the hard sourcing for you. We travel, test, and curate only the chiffons, corduroys, Ankara prints, and
              ready-to-wear staples that meet our standard for movement, durability, and richness. Whether you are a fashion brand owner building
              your next drop or a woman stepping into a room, our fabrics make sure your work speaks before you say a word.
            </p>
          </div>
          <div className="mt-9">
            <ButtonLink to="/#wholesale" className="min-h-14 px-8">Partner with us for wholesale</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. Wholesale concierge ---------------- */

const WHOLESALE_MESSAGE = "Hello Harries Vogue, I'd like a wholesale quote. Fabrics/textures: … Quantities: … Delivery city or country: …";

function Wholesale() {
  return (
    <section id="wholesale" aria-labelledby="wholesale-title" className="home-wrap sec scroll-mt-28 pt-0">
      <div className="wholesale" data-rise>
        <h2 id="wholesale-title" className="display-size max-w-[14ch]">Stocking a boutique or producing a collection?</h2>
        <div>
          <p className="text-lg leading-relaxed text-grey-700">
            Unlock tiered wholesale pricing, priority access to new bales, and dedicated sourcing support on WhatsApp or email. Tell us the
            quantities and textures you need, and we will put a custom quote together within hours.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={`${SHOP.whatsapp}?text=${encodeURIComponent(WHOLESALE_MESSAGE)}`} target="_blank" rel="noopener" className="transfer-wa min-h-14 px-7">
              <WhatsappIcon size={20} /> Chat with our wholesale team
            </a>
            <a href={`mailto:${SHOP.email}?subject=${encodeURIComponent("Wholesale quote")}`} className="btn-outline min-h-14">
              <MailIcon size={18} /> Email us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 7. Questions, answered on the site ---------------- */

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="faq faq-row group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.0625rem] font-semibold">
        {q}
        <span aria-hidden="true" className="faq-chevron" />
      </summary>
      <div className="pb-4 pt-1 text-base leading-relaxed text-grey-700">{children}</div>
    </details>
  );
}

function Questions({ transfer }: { transfer: boolean }) {
  return (
    <section id="questions" aria-labelledby="questions-title" className="home-wrap sec scroll-mt-28 pt-0">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="questions-title" className="sec-title" data-rise>Questions, answered</h2>
          <p className="sec-lead mt-4 max-w-[32ch]">Everything about paying, delivery and returns is here, so you never have to wait for a reply.</p>
        </div>
        <div className="faq-list lg:col-span-8">
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
    <div>
      <Hero />
      <Doors />
      <Fresh products={fresh} />
      <Advantage />
      <PromisePanel />
      <Wholesale />
      <Questions transfer={transfer} />
    </div>
  );
}
