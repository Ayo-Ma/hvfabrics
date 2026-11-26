import { Link, NavLink } from "react-router";
import { BagIcon, SearchIcon, cx } from "@hv/ui";
import { LINES } from "@hv/core";
import { LINE_MENU, LINE_PATHS } from "~/lib/lines";
import { useBag } from "~/lib/bag";
import { SHOP_CITIES } from "~/lib/shop";
import { Lockup } from "./Logo";

/** The menu (owner's copy, 2026-11-26): the three lines, wholesale and the shop's story. */
const MENU = [
  ...LINES.map((l) => ({ to: LINE_PATHS[l], label: LINE_MENU[l] })),
  { to: "/#wholesale", label: "Wholesale Bundles" },
  { to: "/about", label: "About Us" },
];

function MenuLink({ to, label, className }: { to: string; label: string; className?: string }) {
  // "/#wholesale" is a place on the home page, never "the page you're on".
  if (to.includes("#")) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <NavLink to={to} className={({ isActive }) => cx(className, isActive && "is-on")}>
      {label}
    </NavLink>
  );
}

/**
 * Header (2026-11-26 redesign, after drop.code): a thin ink announcement line, then a white bar with
 * the menu on the left, the logo in the middle and search and bag on the right. On phones the menu
 * becomes a row of pills under the logo, so every destination stays one tap away.
 */
export function Header() {
  const bag = useBag();
  return (
    <>
      <p className="announce">
        <span>Global shipping available</span>
        <span aria-hidden="true" className="announce-dot" />
        <span>Wholesale &amp; bulk orders</span>
        <span aria-hidden="true" className="announce-dot" />
        <span>Showrooms in {SHOP_CITIES.replace(" and ", " & ")}</span>
      </p>
      <header className="site-header sticky top-0 z-30">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-yellow focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <div className="mx-auto grid h-16 max-w-(--container-page) grid-cols-[1fr_auto_1fr] items-center gap-4 xl:grid-cols-[auto_1fr_auto] xl:gap-10 px-(--spacing-gutter)">
          <nav aria-label="Shop" className="site-nav hidden justify-self-center xl:block">
            <ul className="flex items-center gap-7 whitespace-nowrap">
              {MENU.map((m) => (
                <li key={m.to}>
                  <MenuLink to={m.to} label={m.label} />
                </li>
              ))}
            </ul>
          </nav>
          <span className="xl:hidden" />

          <Link to="/" className="justify-self-center text-ink xl:order-first xl:justify-self-start" aria-label="Harries Vogue home">
            <Lockup className="block h-8 w-auto sm:h-9 [&>svg]:h-full [&>svg]:w-auto" />
          </Link>

          <div className="flex items-center justify-self-end gap-1">
            <Link to="/search" className="icon-btn">
              <SearchIcon title="Search" />
            </Link>
            <button
              type="button"
              onClick={bag.open}
              data-bag-target
              className="icon-btn relative"
              aria-label={`Bag, ${bag.count} ${bag.count === 1 ? "item" : "items"}`}
            >
              <BagIcon />
              {bag.count > 0 && (
                <span
                  key={bag.count}
                  aria-hidden="true"
                  className="badge-pop tabular absolute right-0.5 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-yellow px-1 text-xs font-semibold text-ink"
                >
                  {bag.count > 99 ? "99+" : bag.count}
                </span>
              )}
            </button>
          </div>
        </div>

        <nav aria-label="Shop (mobile)" className="mobile-nav xl:hidden">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto px-(--spacing-gutter) pb-3">
            {MENU.map((m) => (
              <li key={m.to} className="shrink-0">
                <MenuLink to={m.to} label={m.label} />
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
