import type { ComponentType, ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { cx } from "@hv/ui";
import { BoxIcon, HomeIcon, ListIcon, SettingsIcon, TagIcon, type IconProps } from "@hv/ui/icons";
import monogram from "../../../../assets/brand/logo/hv-monogram-small.svg?raw";
import { useMe } from "../lib/auth";
import { useBoard } from "../lib/data";
import { Toaster } from "./ui";

/**
 * Shell — icon rail (app sheet): a 56 px rail on the page ground with a 1 px edge, the brand
 * mark at the top, outline icons on a 48 px pitch, settings pushed to the bottom.
 * On phones the rail becomes a bottom bar of the same destinations with short labels,
 * and a 48 px top bar names the shop.
 */

interface Dest {
  to: string;
  label: string;
  Icon: ComponentType<IconProps>;
  end?: boolean;
  count?: number;
}

function Mark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block overflow-hidden rounded-[6px] [&_svg]:h-full [&_svg]:w-full", className)} dangerouslySetInnerHTML={{ __html: monogram }} />;
}

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="num absolute -top-1 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neg px-1 text-[11px] font-bold text-white">{n > 99 ? "99+" : n}</span>;
}

export function Shell() {
  const me = useMe();
  const board = useBoard();
  const toPack = board.data?.orders.filter((o) => o.status === "paid").length ?? 0;

  const main: Dest[] = [
    ...(me.can.takings ? [{ to: "/", label: "Today", Icon: HomeIcon, end: true }] : []),
    { to: "/orders", label: "Orders", Icon: BoxIcon, count: toPack },
    ...(me.can.products ? [{ to: "/products", label: "Products", Icon: TagIcon }, { to: "/stock", label: "Stock", Icon: ListIcon }] : []),
  ];
  const settings: Dest = { to: "/settings", label: "Settings", Icon: SettingsIcon };

  return (
    <div className="min-h-dvh lg:pl-14">
      {/* Desktop rail */}
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-14 flex-col items-center border-r border-line bg-ground py-3 lg:flex">
        <NavLink to={main[0]!.to} aria-label="Harries Vogue shop" className="mb-5 block">
          <Mark className="h-9 w-9" />
        </NavLink>
        <ul className="flex flex-col gap-1">
          {main.map((d) => (
            <RailItem key={d.to} d={d} />
          ))}
        </ul>
        <ul className="mt-auto">
          <RailItem d={settings} />
        </ul>
      </nav>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 border-b border-line bg-ground/95 px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Mark className="h-7 w-7" />
        <span className="text-[15px] font-bold tracking-[-0.01em]">Harries Vogue</span>
        <span className="text-muted">Shop</span>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 lg:px-9 lg:pt-8 lg:pb-12">
        {me.sampleData ? <SampleBanner /> : null}
        <Outlet />
      </main>

      {/* Phone bottom bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="flex">
          {[...main, settings].map((d) => (
            <li key={d.to} className="flex-1">
              <NavLink
                to={d.to}
                end={d.end}
                className={({ isActive }) => cx("flex h-[60px] flex-col items-center justify-center gap-1 text-xs", isActive ? "font-bold text-text" : "text-muted")}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx("relative flex h-7 w-12 items-center justify-center rounded-full", isActive && "bg-active")}>
                      <d.Icon size={20} />
                      {d.count ? <Count n={d.count} /> : null}
                    </span>
                    {d.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Toaster />
    </div>
  );
}

function RailItem({ d }: { d: Dest }) {
  return (
    <li>
      <NavLink
        to={d.to}
        end={d.end}
        title={d.label}
        aria-label={d.count ? `${d.label}, ${d.count} to pack` : d.label}
        className={({ isActive }) =>
          cx("relative flex h-11 w-10 items-center justify-center rounded-[var(--radius-control)] transition-colors", isActive ? "bg-active text-text" : "text-muted hover:text-text")
        }
      >
        <d.Icon size={20} />
        {d.count ? <Count n={d.count} /> : null}
      </NavLink>
    </li>
  );
}

function SampleBanner(): ReactNode {
  return (
    <p className="mb-5 rounded-[var(--radius-card)] border border-warn-line bg-warn-bg px-4 py-2.5 text-sm text-warn-ink">
      Development data: these products and orders are samples, not the real shop.
    </p>
  );
}
