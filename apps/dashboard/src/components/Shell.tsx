import type { ComponentType, ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { cx } from "@hv/ui";
import { BoxIcon, HomeIcon, ListIcon, SettingsIcon, TagIcon, type IconProps } from "@hv/ui/icons";
import lockup from "../../../../assets/brand/logo/hv-lockup-horizontal-small.svg?raw";
import monogram from "../../../../assets/brand/logo/hv-monogram-small.svg?raw";
import { useMe } from "../lib/auth";
import { useBoard } from "../lib/data";
import { Toaster } from "./ui";

/**
 * Shell, three widths:
 *  - phone (< 768): a top bar naming the screen, and a bottom bar of the destinations (thumb reach);
 *  - tablet (768–1023): an 80 px rail, icon over a short label, so the phone layout never stretches;
 *  - desktop (≥ 1024): a 232 px sidebar with the logo, labelled destinations and who is signed in.
 * The current destination is marked in ink (yellow stays for primary buttons and focus).
 */

interface Dest {
  to: string;
  label: string;
  Icon: ComponentType<IconProps>;
  end?: boolean;
  count?: number;
}

const ROLE: Record<string, string> = { owner: "Owner", manager: "Manager", packer: "Packer" };

function Mark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block overflow-hidden rounded-[8px] [&_svg]:h-full [&_svg]:w-full", className)} dangerouslySetInnerHTML={{ __html: monogram }} />;
}

function Count({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cx("num flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neg px-1 text-[11px] font-bold leading-none text-white", className)}>
      {n > 99 ? "99+" : n}
      <span className="sr-only"> to pack</span>
    </span>
  );
}

export function Shell() {
  const me = useMe();
  const board = useBoard();
  const { pathname } = useLocation();
  const toPack = board.data?.orders.filter((o) => o.status === "paid").length ?? 0;

  const main: Dest[] = [
    ...(me.can.takings ? [{ to: "/", label: "Today", Icon: HomeIcon, end: true }] : []),
    { to: "/orders", label: "Orders", Icon: BoxIcon, count: toPack },
    ...(me.can.products ? [{ to: "/products", label: "Products", Icon: TagIcon }, { to: "/stock", label: "Stock", Icon: ListIcon }] : []),
  ];
  const settings: Dest = { to: "/settings", label: "Settings", Icon: SettingsIcon };
  const all = [...main, settings];
  const here = all.find((d) => (d.end ? pathname === d.to : pathname === d.to || pathname.startsWith(`${d.to}/`)))?.label ?? "Shop";

  return (
    <div className="min-h-dvh md:pl-20 lg:pl-[232px]">
      {/* Tablet rail and desktop sidebar: one nav that widens. */}
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-line bg-surface md:flex lg:w-[232px]">
        <NavLink to={main[0]!.to} aria-label="Harries Vogue shop" className="flex h-16 items-center justify-center px-5 lg:justify-start">
          <Mark className="h-9 w-9 lg:hidden" />
          <span className="hidden w-[150px] text-text lg:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:fill-current" aria-hidden="true" dangerouslySetInnerHTML={{ __html: lockup }} />
        </NavLink>
        <p className="mt-3 hidden px-5 text-[11px] font-medium uppercase tracking-[0.1em] text-faint lg:block">Shop</p>
        <ul className="mt-2 flex flex-col gap-1 px-2 lg:px-3">
          {main.map((d) => (
            <SideItem key={d.to} d={d} />
          ))}
        </ul>
        <div className="mt-auto px-2 pb-4 lg:px-3">
          <ul>
            <SideItem d={settings} />
          </ul>
          <div className="mt-3 hidden items-center gap-3 border-t border-rule px-2 pt-4 lg:flex">
            <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-text text-sm font-bold uppercase text-paper">
              {(me.email ?? ROLE[me.role] ?? "?").slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{me.email ?? "Signed in"}</span>
              <span className="block text-xs text-muted">{ROLE[me.role] ?? me.role}</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Phone top bar: brand and the screen you're on */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Mark className="h-8 w-8" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Harries Vogue</span>
            <span className="block truncate text-[15px] font-bold">{here}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 md:pb-12 lg:px-10 lg:pt-9">
        {me.sampleData ? <SampleBanner /> : null}
        <Outlet />
      </main>

      {/* Phone bottom bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {all.map((d) => (
            <li key={d.to} className="min-w-0 flex-1">
              <NavLink
                to={d.to}
                end={d.end}
                className={({ isActive }) => cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", isActive ? "font-bold text-text" : "text-muted")}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx("relative flex h-8 w-14 items-center justify-center rounded-full transition-colors", isActive ? "bg-text text-paper" : "")}>
                      <d.Icon size={20} />
                      {d.count ? <Count n={d.count} className="absolute -top-1 right-1" /> : null}
                    </span>
                    <span className="truncate">{d.label}</span>
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

function SideItem({ d }: { d: Dest }) {
  return (
    <li>
      <NavLink
        to={d.to}
        end={d.end}
        className={({ isActive }) =>
          cx(
            "relative flex flex-col items-center justify-center gap-1 rounded-[10px] py-2 text-[11px] transition-colors duration-fast",
            "lg:h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-0 lg:text-sm",
            isActive ? "bg-text font-semibold text-paper" : "text-muted hover:bg-raised hover:text-text",
          )
        }
      >
        <span className="relative">
          <d.Icon size={20} />
          {d.count ? <Count n={d.count} className="absolute -top-2 -right-3 lg:hidden" /> : null}
        </span>
        <span>{d.label}</span>
        {d.count ? <Count n={d.count} className="ml-auto hidden lg:flex" /> : null}
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
