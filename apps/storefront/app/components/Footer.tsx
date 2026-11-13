import { Link } from "react-router";
import { LINES } from "@hv/core";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { Wordmark } from "./Logo";

/** The footer inverts to paper and closes with the wordmark at full width. */
export function Footer() {
  return (
    <footer className="bg-paper text-ink">
      <div className="mx-auto grid max-w-(--container-page) gap-y-10 px-(--spacing-gutter) pb-6 pt-16 md:min-h-[70svh] md:grid-rows-[auto_1fr_auto]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 text-[15px] md:grid-cols-4">
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-normal">Shop</h2>
            <ul className="mt-3 space-y-2 text-grey-600">
              {LINES.map((l) => (
                <li key={l}>
                  <Link className="hover:text-ink" to={LINE_PATHS[l]}>
                    {LINE_LABELS[l]}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="hover:text-ink" to="/search">
                  Search
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-normal">Orders</h2>
            <ul className="mt-3 space-y-2 text-grey-600">
              <li>
                <Link className="hover:text-ink" to="/track">
                  Track an order
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink" to="/policies/delivery">
                  Delivery
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink" to="/policies/returns">
                  Returns
                </Link>
              </li>
              <li>
                <Link className="hover:text-ink" to="/policies/privacy">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-normal">Visit the shop</h2>
            <p className="mt-3 text-grey-600">[TBC: shop address, Abule Egba, Lagos]</p>
            <p className="mt-2 text-grey-600">[TBC: opening hours]</p>
          </div>
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-normal">Talk to us</h2>
            <ul className="mt-3 space-y-2 text-grey-600">
              <li>[TBC: WhatsApp number]</li>
              <li>[TBC: Instagram handle]</li>
              <li>[TBC: email]</li>
            </ul>
          </div>
        </div>

        <div aria-hidden="true" />

        <div>
          <Wordmark className="block w-full [&>svg]:h-auto [&>svg]:w-full" />
          <p className="mt-5 text-[13px] text-grey-600">
            © {new Date().getFullYear()} Harries Vogue. Payments are processed securely by Paystack.
          </p>
        </div>
      </div>
    </footer>
  );
}
