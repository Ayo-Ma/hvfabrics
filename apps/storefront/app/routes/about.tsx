import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, cx } from "@hv/ui";
import { Media } from "~/components/Media";
import { SHOP, SHOP_CITIES } from "~/lib/shop";
import { cutoffText, shopStatus, useLagosClock } from "~/lib/clock";

/*
 * Our shops — "The pinned poster" (design-taste-frontend, seed 1727317164).
 * Idea: her two shop cities become the two words pinned to opposite corners of the screen while her
 * fabrics pass between them. Live thing: each corner carries a shop clock (open now, time to closing)
 * and the visit planner counts down to the 10am same-day dispatch cut-off, in Nigerian time.
 * Photographs are generated stand-ins (CLAUDE.md 2026-11-17), none repeated from the homepage, no lace
 * outside wedding and aso-ebi; swap in her own shop photographs when they arrive.
 */

export function meta() {
  return [
    { title: "Our shops · Harries Vogue" },
    {
      name: "description",
      content: `Eight years selling fabric, Ankara and ready-to-wear. Visit Harries Vogue in ${SHOP_CITIES}, open ${SHOP.hours}, or order online and collect for free.`,
    },
  ];
}

function StatusLine({ mins, className }: { mins: number | null; className?: string }) {
  const s = shopStatus(mins);
  return (
    <p className={cx("status-line", className)} aria-live="polite">
      <span aria-hidden="true" className={cx("status-dot", s.open === true && "is-open", s.open === false && "is-closed")} />
      {s.text}
    </p>
  );
}

const directions = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/* ---------------- 1. The window that opens to the edges ---------------- */

function useScrollProgress(ref: React.RefObject<HTMLElement | null>, cssVar: string, travel: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (window.innerHeight * travel)));
      el.style.setProperty(cssVar, p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, cssVar, travel]);
}

function WindowHero() {
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref, "--p", 0.5);
  return (
    <section ref={ref} aria-labelledby="about-title" className="about-hero">
      <div className="about-hero-stage">
        <div className="about-hero-window">
          <Media
            slot="banners/campaign-eid-phone"
            alt="A woman in an ivory embroidered voile kaftan and a yellow scarf, sitting in warm afternoon light"
            sizes="100vw"
            priority
            ratio="3 / 4"
            tone="dark"
            className="size-full lg:hidden"
            imgClassName="object-[50%_30%]"
          />
          <Media
            slot="banners/campaign-eid-desktop"
            alt="A woman in an ivory embroidered voile kaftan and a yellow scarf, sitting in warm afternoon light"
            sizes="100vw"
            ratio="8 / 3"
            tone="dark"
            className="hidden size-full lg:block"
            imgClassName="object-[100%_30%]"
          />
        </div>
        <div className="about-hero-copy">
          <h1 id="about-title" className="about-hero-title">
            <span className="cover-line"><span>Eight years</span></span>
            <span className="cover-line"><span style={{ animationDelay: "120ms" }}>of fabric</span></span>
          </h1>
          <div className="about-hero-side">
            <p>Two shops, in {SHOP_CITIES}, and a WhatsApp line that answers. Come and feel the fabric, or let it come to you.</p>
            <a href="#shops" className="about-btn">
              Find a shop
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. Ilorin and Abeokuta, pinned; her fabrics pass between ---------------- */

const PASSING = [
  { slot: "products/fabric/gold-damask/02-drape", alt: "Gold damask draped to the floor, its woven flowers catching the light", word: "Honesty", line: "What you see is what's on the shelf. If we send the wrong thing, we put it right." },
  { slot: "products/rtw/black-wrap-midi/02-drape", alt: "A woman smiling in a black wrap midi dress", word: "Quality", line: "Fabric you'll be proud to hand to your tailor, and prouder to wear." },
  { slot: "products/fabric/indigo-aso-oke/02-drape", alt: "Indigo aso-oke folded and draped, its woven stripes in the light", word: "Affordability", line: "Looking your best on the day shouldn't take the whole budget." },
  { slot: "products/rtw/ivory-linen-coord/02-drape", alt: "A woman walking in an ivory linen jacket and trousers", word: "In her words", line: "“Harries Vogue started from a passion for beautiful fabrics, and a wish to make quality fashion materials accessible and affordable to everyone.” The owner" },
];

function TwoShops({ mins }: { mins: number | null }) {
  const [ilorin, abeokuta] = SHOP.shops;
  return (
    <section id="shops" aria-labelledby="shops-title" className="pin-run">
      <div className="pin-layer">
        <h2 id="shops-title" className="pin-words">
          <span className="pin-word pin-word-a">{ilorin.city}</span>
          <span className="sr-only"> and </span>
          <span className="pin-word pin-word-b">{abeokuta.city}</span>
        </h2>
        <div className="pin-meta pin-meta-a">
          <p className="font-medium">{ilorin.address}</p>
          <StatusLine mins={mins} />
          <a className="link-arrow mt-2" href={directions(ilorin.address)} target="_blank" rel="noopener">
            Directions <ArrowRightIcon size={18} />
          </a>
        </div>
        <div className="pin-meta pin-meta-b">
          <p className="font-medium">{abeokuta.address}</p>
          <StatusLine mins={mins} className="justify-end" />
          <a className="link-arrow mt-2" href={directions(abeokuta.address)} target="_blank" rel="noopener">
            Directions <ArrowRightIcon size={18} />
          </a>
        </div>
      </div>
      <div className="pin-flow">
        {PASSING.map((p, i) => (
          <figure key={p.slot} className={cx("pin-print", i % 2 ? "is-right" : "is-left")} data-rise>
            <Media slot={p.slot} alt={p.alt} sizes="(min-width: 1024px) 21vw, 72vw" ratio="4 / 5" className="aspect-[4/5] w-full overflow-hidden" imgClassName="pin-img" />
            <figcaption className="mt-4">
              <span className="way-title block">{p.word}</span>
              <span className="mt-2 block max-w-[34ch] text-base">{p.line}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 3. Plan your visit: sticky photograph, active list ---------------- */

function VisitPlanner({ mins }: { mins: number | null }) {
  const [ilorin, abeokuta] = SHOP.shops;
  const rows = [
    { key: "ilorin", name: `${ilorin.city} shop`, value: SHOP.hours, slot: "banners/line-rtw-banner", alt: "A woman in an ivory linen co-ord leaning against a pale wall", pos: "object-[70%_30%]", body: `${ilorin.address}. Feel the fabric, ask us anything, and take it home.`, href: directions(ilorin.address), cta: "Get directions" },
    { key: "abeokuta", name: `${abeokuta.city} shop`, value: SHOP.hours, slot: "products/fabric/black-swiss-voile/02-drape", alt: "Black Swiss voile draped, its dotted weave against the light", body: `${abeokuta.address}. Feel the fabric, ask us anything, and take it home.`, href: directions(abeokuta.address), cta: "Get directions" },
    { key: "pickup", name: "Collect for free", value: "Free", slot: "products/fabric/gold-damask/01-front", alt: "Gold damask folded on a plain ground", body: "Order online, choose collection at checkout, and pick it up from either shop. No delivery fee.", href: "/fabrics", cta: "Find your fabric" },
    { key: "sameday", name: "Same-day dispatch", value: cutoffText(mins), slot: "products/fabric/indigo-aso-oke/01-front", alt: "Indigo aso-oke folded on a plain ground", body: `Pay before ${SHOP.sameDayCutoff} and your order goes out the same day, by Speedaf or park dispatch.`, href: "/policies/delivery", cta: "Delivery details" },
    { key: "delivery", name: "Delivery across Nigeria", value: "From ₦3,000", slot: "products/rtw/black-wrap-midi/01-front", alt: "A black wrap midi dress on an invisible form", body: "Lagos, Abuja, Ibadan, Akure, Osogbo and Abeokuta, with the fee shown at checkout. Anywhere else, message us first.", href: "/policies/delivery", cta: "See the fees" },
    { key: "measure", name: "Made to measure", value: "On request", slot: "products/rtw/ivory-linen-coord/01-front", alt: "An ivory linen jacket and trousers on an invisible form", body: "Want a ready-to-wear piece cut to your size? Send us your measurements on WhatsApp and we'll take it from there.", href: SHOP.whatsapp, cta: "Message us" },
    { key: "abroad", name: "Sending abroad", value: "Ask us", slot: "products/fabric/indigo-aso-oke/03-macro", alt: "The woven texture of indigo aso-oke, close up", body: "We send orders abroad too. Message us before you order and we'll arrange it with you.", href: SHOP.whatsapp, cta: "Message us" },
  ];
  const [open, setOpen] = useState(0);
  const [shown, setShown] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // On a phone, the row nearest the middle of the screen becomes the active one as you scroll.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !("IntersectionObserver" in window) || window.matchMedia("(hover: hover)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setShown(Number((e.target as HTMLElement).dataset.row));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    list.querySelectorAll("[data-row]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section aria-labelledby="visit-title" className="bg-paper">
      <div className="visit-grid mx-auto max-w-(--container-page) px-(--spacing-gutter)">
        <h2 id="visit-title" className="visit-title chapter-title" data-rise>Plan your visit</h2>
        <div className="visit-photo" data-rise>
          {rows.map((r, i) => (
            <div key={r.key} aria-hidden={i !== shown} className={cx("visit-frame", i === shown && "is-active")}>
              <Media slot={r.slot} alt={r.alt} sizes="(min-width: 1024px) 34vw, 100vw" ratio="4 / 5" className="size-full" {...("pos" in r ? { imgClassName: r.pos } : {})} />
            </div>
          ))}
        </div>
        <div className="visit-list-col">
          <ul ref={listRef} className="visit-list">
            {rows.map((r, i) => {
              const on = i === open;
              const external = r.href.startsWith("http");
              return (
                <li key={r.key} data-row={i} className={cx("visit-row", on && "is-active")} data-rise style={{ ["--rise-i" as string]: i }}>
                  <button
                    type="button"
                    className="visit-row-head"
                    aria-expanded={on}
                    aria-controls={`visit-${r.key}`}
                    onClick={() => {
                      setOpen(i);
                      setShown(i);
                    }}
                    onMouseEnter={() => setShown(i)}
                    onFocus={() => setShown(i)}
                  >
                    <span className="visit-name">{r.name}</span>
                    <span className="visit-value tabular">{r.value}</span>
                  </button>
                  <div id={`visit-${r.key}`} className="visit-body" inert={!on}>
                    <div className="visit-body-inner">
                    <p>{r.body}</p>
                    {r.key === "ilorin" || r.key === "abeokuta" ? <StatusLine mins={mins} className="mt-2" /> : null}
                    <a className="link-arrow mt-3" href={r.href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
                      {r.cta} <ArrowRightIcon size={18} />
                    </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 4. The number as display type ---------------- */

function TalkToUs() {
  return (
    <section aria-labelledby="talk-title" className="talk">
      <div className="talk-inner mx-auto max-w-(--container-page) px-(--spacing-gutter)">
        <div>
          <h2 id="talk-title" className="chapter-title" data-rise>Talk to us</h2>
          <p className="mt-5 max-w-[34ch] text-xl" data-rise style={{ ["--rise-i" as string]: 1 }}>
            Not sure which fabric, or how many yards? Message us. We&rsquo;d rather help you choose than have you guess.
          </p>
        </div>
        <a data-rise style={{ ["--rise-i" as string]: 2 }} className="talk-number tabular" href={SHOP.whatsapp} target="_blank" rel="noopener" aria-label={`WhatsApp us on ${SHOP.phone.display}`}>
          {SHOP.phone.display}
        </a>
        <div className="talk-corners" data-rise style={{ ["--rise-i" as string]: 3 }}>
          <ul className="space-y-2">
            <li><a className="footer-link" href={`tel:${SHOP.phone.tel}`}>Call {SHOP.phone.display}</a></li>
            <li><a className="footer-link [overflow-wrap:anywhere]" href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
            <li className="text-grey-300">{SHOP_CITIES}</li>
          </ul>
          <ul className="space-y-2 sm:text-right">
            {SHOP.socials.map((s) => (
              <li key={s.label}>
                <a className="footer-link" href={s.url} target="_blank" rel="noopener">{s.label} {s.handle}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function About() {
  const mins = useLagosClock();
  return (
    <>
      <WindowHero />
      <TwoShops mins={mins} />
      <VisitPlanner mins={mins} />
      <TalkToUs />
    </>
  );
}
