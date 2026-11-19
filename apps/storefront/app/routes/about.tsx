import { ArrowRightIcon } from "@hv/ui";
import { ButtonLink } from "~/components/Button";
import { Media } from "~/components/Media";
import { SHOP, SHOP_CITIES } from "~/lib/shop";

/*
 * Our shops (owner's questionnaire Q59). Her own words, her three values, both shops with directions.
 * The photographs are editorial stand-ins (CLAUDE.md, 2026-11-17), so no caption claims they show her shops;
 * swap in her own shop photos when she sends them.
 */

export function meta() {
  return [
    { title: "Our shops · Harries Vogue" },
    {
      name: "description",
      content: `Eight years selling fabric, lingerie and ready-to-wear. Visit Harries Vogue in ${SHOP_CITIES}, open ${SHOP.hours}, or order online and collect for free.`,
    },
  ];
}

const VALUES = [
  { word: "Honesty", line: "What you see is what's on the shelf, and what we say is what you get. If we send the wrong thing, we put it right." },
  { word: "Quality", line: "Fabric you'll be proud to hand to your tailor, and prouder to wear." },
  { word: "Affordability", line: "Looking your best on the day shouldn't take the whole budget." },
];

const directions = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export default function About() {
  return (
    <>
      {/* The counter, then her words */}
      <section aria-labelledby="about-title" className="bg-paper">
        <Media
          slot="banners/line-fabrics-banner"
          alt="A woman in a black lace dress and yellow gele unrolling wine sequin lace across a shop counter"
          sizes="100vw"
          priority
          ratio="12 / 5"
          className="cover-photo aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[3/1]"
          imgClassName="object-[68%_40%]"
        />
        <div className="mx-auto grid max-w-(--container-page) gap-10 px-(--spacing-gutter) py-12 md:grid-cols-12 md:py-16">
          <h1 id="about-title" className="display-size md:col-span-6">
            <span className="cover-line"><span>Eight years</span></span>
            <span className="cover-line"><span style={{ animationDelay: "120ms" }}>of fabric</span></span>
          </h1>
          <div className="cover-fade md:col-span-5 md:col-start-8">
            <p className="text-lg leading-relaxed">
              Harries Vogue has been selling fabric for {SHOP.years} years, from our shops in {SHOP_CITIES} to customers across Nigeria.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href="#shops-title" className="inline-flex min-h-14 items-center justify-center bg-yellow px-8 font-semibold text-ink transition-[background-color,translate] duration-(--duration-base) hover:-translate-y-0.5 hover:bg-yellow-press">
                Visit a shop
              </a>
              <a href={SHOP.whatsapp} target="_blank" rel="noopener" className="link-quiet">WhatsApp us</a>
            </div>
            <blockquote className="mt-8 border-l-4 border-yellow pl-5">
              <p className="text-xl leading-snug">
                &ldquo;Harries Vogue started from a passion for beautiful fabrics, and a wish to make quality fashion materials accessible and
                affordable to everyone. We want every customer to feel confident they are getting genuine value for their money.&rdquo;
              </p>
              <footer className="mt-3 text-[15px] text-grey-600">The owner</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* What she stands for: three words, set large */}
      <section aria-labelledby="values-title" className="bg-ink text-paper">
        <div className="mx-auto grid max-w-(--container-page) gap-12 px-(--spacing-gutter) py-24 md:grid-cols-12 md:items-center md:py-32">
          <div className="overflow-hidden md:col-span-5" data-rise>
            <Media
              slot="campaign/stage-03-yard"
              alt="Hands laying a yellow tape measure along emerald beaded lace"
              sizes="(min-width: 768px) 40vw, 100vw"
              ratio="4 / 5"
              tone="dark"
              className="aspect-[4/5] w-full"
            />
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <h2 id="values-title" className="chapter-title" data-rise>What we stand for</h2>
            <dl className="mt-12 space-y-10">
              {VALUES.map((v, i) => (
                <div key={v.word} data-rise style={{ ["--rise-i" as string]: i + 1 }}>
                  <dt className="way-title text-yellow">{v.word}</dt>
                  <dd className="mt-3 max-w-[40ch] text-lg text-grey-100">{v.line}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* The two shops */}
      <section aria-labelledby="shops-title" className="bg-paper">
        <div className="mx-auto grid max-w-(--container-page) gap-12 px-(--spacing-gutter) py-24 md:grid-cols-12 md:py-32">
          <div className="md:col-span-5">
            <h2 id="shops-title" className="chapter-title" data-rise>Come and see us</h2>
            <p className="mt-6 max-w-[38ch] text-lg" data-rise style={{ ["--rise-i" as string]: 1 }}>
              Feel the fabric in the light, ask us anything, and take it home. Or order online and collect it from either shop, free.
            </p>
            <div className="mt-10 overflow-hidden" data-rise style={{ ["--rise-i" as string]: 2 }}>
              <Media
                slot="campaign/stage-02-bolt"
                alt="Bolts of lace, sequin and aso-oke on dark wooden shelves"
                sizes="(min-width: 768px) 40vw, 100vw"
                ratio="4 / 5"
                className="aspect-[4/3] w-full md:aspect-[4/5]"
              />
            </div>
          </div>
          <div className="space-y-24 md:col-span-6 md:col-start-7 md:pt-24">
            {SHOP.shops.map((s, i) => (
              <article key={s.id} aria-labelledby={`shop-${s.id}`} data-rise style={{ ["--rise-i" as string]: i + 1 }}>
                <h3 id={`shop-${s.id}`} className="display-size">{s.city}</h3>
                <p className="mt-5 text-xl font-medium">{s.address}</p>
                <ul className="mt-4 space-y-1 text-lg">
                  <li>Open {SHOP.hours}</li>
                  <li>Collect your online order here, free</li>
                </ul>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                  <a href={directions(s.address)} target="_blank" rel="noopener" className="link-arrow">
                    Get directions <ArrowRightIcon size={20} />
                  </a>
                  <a href={SHOP.whatsapp} target="_blank" rel="noopener" className="link-arrow">
                    WhatsApp us <ArrowRightIcon size={20} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Talk to us */}
      <section aria-labelledby="talk-title" className="bg-grey-100">
        <div className="mx-auto grid max-w-(--container-page) gap-10 px-(--spacing-gutter) py-20 md:grid-cols-12 md:items-end md:py-28">
          <div className="md:col-span-6">
            <h2 id="talk-title" className="chapter-title" data-rise>Talk to us</h2>
            <p className="mt-6 max-w-[40ch] text-lg" data-rise style={{ ["--rise-i" as string]: 1 }}>
              Not sure which fabric, or how many yards? Message us. We&rsquo;d rather help you choose than have you guess.
            </p>
            <div className="mt-8" data-rise style={{ ["--rise-i" as string]: 2 }}>
              <ButtonLink to="/fabrics" className="min-h-14 px-8">Find your fabric</ButtonLink>
            </div>
          </div>
          <ul className="space-y-3 text-lg md:col-span-5 md:col-start-8" data-rise style={{ ["--rise-i" as string]: 2 }}>
            <li><a className="link-quiet" href={SHOP.whatsapp} target="_blank" rel="noopener">WhatsApp {SHOP.phone.display}</a></li>
            <li><a className="link-quiet" href={`tel:${SHOP.phone.tel}`}>Call {SHOP.phone.display}</a></li>
            <li><a className="link-quiet [overflow-wrap:anywhere]" href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
            {SHOP.socials.map((s) => (
              <li key={s.label}>
                <a className="link-quiet" href={s.url} target="_blank" rel="noopener">{s.label} {s.handle}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
