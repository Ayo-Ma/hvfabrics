import { Link, NavLink } from "react-router";
import { BagIcon, SearchIcon, cx } from "@hv/ui";
import { LINES } from "@hv/core";
import { LINE_LABELS, LINE_PATHS } from "~/lib/lines";
import { useBag } from "~/lib/bag";
import { Lockup } from "./Logo";

export function Header() {
  const bag = useBag();
  return (
    <header className="sticky top-0 z-30 bg-ink text-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-yellow focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-(--container-page) items-center gap-6 px-(--spacing-gutter)">
        <Link to="/" className="shrink-0 text-yellow" aria-label="Harries Vogue home">
          <Lockup className="block h-9 w-auto [&>svg]:h-full [&>svg]:w-auto" />
        </Link>

        <nav aria-label="Shop" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-7 text-[15px] font-medium">
            {LINES.map((line) => (
              <li key={line}>
                <NavLink
                  to={LINE_PATHS[line]}
                  className={({ isActive }) =>
                    cx(
                      "relative py-2 transition-colors duration-(--duration-fast) hover:text-yellow",
                      isActive && "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:bg-yellow",
                    )
                  }
                >
                  {LINE_LABELS[line]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-4">
          <Link
            to="/search"
            className="grid size-11 place-items-center transition-colors duration-(--duration-fast) hover:text-yellow"
          >
            <SearchIcon title="Search" />
          </Link>
          <button
            type="button"
            onClick={bag.open}
            data-bag-target
            className="relative grid size-11 place-items-center transition-colors duration-(--duration-fast) hover:text-yellow"
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

      {/* Phone: the three lines stay one tap away instead of hiding in a menu. */}
      <nav aria-label="Shop (mobile)" className="md:hidden">
        <ul className="flex gap-6 overflow-x-auto px-(--spacing-gutter) pb-3 text-[15px] font-medium">
          {LINES.map((line) => (
            <li key={line} className="shrink-0">
              <NavLink
                to={LINE_PATHS[line]}
                className={({ isActive }) => cx("block py-1", isActive ? "text-yellow" : "text-paper")}
              >
                {LINE_LABELS[line]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
