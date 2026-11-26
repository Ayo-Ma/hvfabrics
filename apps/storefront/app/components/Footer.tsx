import { Link } from "react-router";
import { LINES } from "@hv/core";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { Wordmark } from "./Logo";
import { SHOP, SHOP_CITIES } from "~/lib/shop";

/**
 * The footer: a plain ink ground (clear to read at any size), the name across the bottom at full
 * width. The local details
 * (showrooms, hours, how orders travel) live here so the top of every page stays global.
 */
export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-ink text-paper">
      <div className="mx-auto flex max-w-(--container-page) flex-col justify-between gap-20 px-(--spacing-gutter) pb-6 pt-16 lg:pt-20">
        <div className="grid gap-x-6 gap-y-10 text-base sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="text-2xl font-bold tracking-[-0.03em]">Harries Vogue</p>
            <p className="mt-3 max-w-[30ch] text-grey-300">Global wholesale &amp; retail fabrics, Ankara &amp; ready-to-wear.</p>
          </div>

          <nav aria-labelledby="footer-shop" className="lg:col-span-2">
            <h2 id="footer-shop" className="font-sans text-base font-bold tracking-normal">Quick links</h2>
            <ul className="mt-3 space-y-2">
              {LINES.map((l) => (
                <li key={l}>
                  <Link className="footer-link" to={LINE_PATHS[l]}>{LINE_LABELS[l]}</Link>
                </li>
              ))}
              <li><Link className="footer-link" to="/policies/delivery">Shipping &amp; delivery rates</Link></li>
              <li><Link className="footer-link" to="/#wholesale">Wholesale</Link></li>
              <li><Link className="footer-link" to="/track">Track an order</Link></li>
              <li><Link className="footer-link" to="/policies/returns">Returns</Link></li>
              <li><Link className="footer-link" to="/policies/privacy">Privacy</Link></li>
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="font-sans text-base font-bold tracking-normal">
              <Link className="footer-link" to="/about">Visit our showrooms</Link>
            </h2>
            <ul className="mt-3 space-y-4">
              {SHOP.shops.map((s) => (
                <li key={s.id}>
                  <span className="block font-semibold">{s.city} showroom</span>
                  <span className="block text-grey-300">{s.address}</span>
                  <span className="block text-grey-300">Open {SHOP.hours}</span>
                </li>
              ))}
              <li>
                <span className="block font-semibold">Dispatch</span>
                <span className="block text-grey-300">Across Nigeria by Speedaf and park dispatch. Abroad by arrangement on WhatsApp.</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="font-sans text-base font-bold tracking-normal">Talk to us</h2>
            <ul className="mt-3 space-y-2">
              <li><a className="footer-link" href={SHOP.whatsapp} rel="noopener" target="_blank">WhatsApp {SHOP.phone.display}</a></li>
              <li><a className="footer-link" href={`tel:${SHOP.phone.tel}`}>Call {SHOP.phone.display}</a></li>
              <li><a className="footer-link [overflow-wrap:anywhere]" href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
              {SHOP.socials.map((s) => (
                <li key={s.label}>
                  <a className="footer-link" href={s.url} rel="noopener" target="_blank">{s.label} {s.handle}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <Wordmark className="block w-full text-paper [&>svg]:h-auto [&>svg]:w-full" />
          <p className="mt-5 text-[15px]">
            © {new Date().getFullYear()} Harries Vogue, {SHOP_CITIES}.
          </p>
        </div>
      </div>
    </footer>
  );
}
