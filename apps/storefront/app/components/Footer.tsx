import { Link } from "react-router";
import { LINES } from "@hv/core";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { Media } from "./Media";
import { Wordmark } from "./Logo";
import { SHOP, SHOP_CITIES } from "~/lib/shop";

/**
 * The footer is the last photograph: the aso-ebi group at golden hour, darkened evenly so paper
 * type reads anywhere on it, with the name across the bottom at full width. Without the photograph
 * it falls back to the ink ground.
 */
export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-ink text-paper">
      <Media
        slot="campaign/footer-owambe"
        alt=""
        sizes="100vw"
        ratio="16 / 9"
        tone="dark"
        className="absolute inset-0 -z-10 size-full"
        imgClassName="brightness-[0.62]"
      />
      <div className="mx-auto flex min-h-[88svh] max-w-(--container-page) flex-col justify-between gap-16 px-(--spacing-gutter) pb-6 pt-10 md:min-h-svh">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-base md:grid-cols-4">
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="font-sans text-base font-bold tracking-normal">Shop</h2>
            <ul className="mt-3 space-y-2">
              {LINES.map((l) => (
                <li key={l}>
                  <Link className="footer-link" to={LINE_PATHS[l]}>{LINE_LABELS[l]}</Link>
                </li>
              ))}
              <li><Link className="footer-link" to="/search">Search</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-orders">
            <h2 id="footer-orders" className="font-sans text-base font-bold tracking-normal">Orders</h2>
            <ul className="mt-3 space-y-2">
              <li><Link className="footer-link" to="/about">Our shops</Link></li>
              <li><Link className="footer-link" to="/track">Track an order</Link></li>
              <li><Link className="footer-link" to="/policies/delivery">Delivery</Link></li>
              <li><Link className="footer-link" to="/policies/returns">Returns</Link></li>
              <li><Link className="footer-link" to="/policies/privacy">Privacy</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="font-sans text-base font-bold tracking-normal">
              <Link className="footer-link" to="/about">Visit a shop</Link>
            </h2>
            <ul className="mt-3 space-y-2">
              {SHOP.shops.map((s) => (
                <li key={s.id}>{s.address}</li>
              ))}
            </ul>
            <p className="mt-2">Open {SHOP.hours}</p>
          </div>
          <div>
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
