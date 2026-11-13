import { useSyncExternalStore, type ComponentPropsWithRef, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cx } from "@hv/ui";
import { AlertTriangleIcon } from "@hv/ui/icons";
import { ago, clock } from "../lib/format";

/* ---------- Buttons ---------- */

type Tone = "primary" | "secondary" | "ghost" | "text" | "danger";

const tones: Record<Tone, string> = {
  // The one primary per screen: Harries Yellow with black text (brand rule).
  primary: "bg-yellow text-ink hover:bg-yellow-press font-bold",
  secondary: "bg-surface text-text border border-control hover:border-text font-medium",
  ghost: "bg-active text-text hover:bg-[#dfdfd9] font-medium",
  text: "text-text underline-offset-4 hover:underline font-medium px-0",
  danger: "bg-surface text-neg border border-control hover:border-neg font-medium",
};

export function buttonClass(tone: Tone = "secondary", size: "md" | "lg" = "md") {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] transition-colors duration-fast",
    "disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-raised disabled:text-faint disabled:border-line",
    size === "md" ? "h-9 px-3.5 text-sm" : "h-11 px-4 text-[15px]",
    tones[tone],
  );
}

export function Button({ tone = "secondary", size = "md", className, ...rest }: ComponentPropsWithRef<"button"> & { tone?: Tone; size?: "md" | "lg" }) {
  return <button type="button" className={cx(buttonClass(tone, size), className)} {...rest} />;
}

export function ButtonLink({ tone = "secondary", size = "md", className, ...rest }: LinkProps & { tone?: Tone; size?: "md" | "lg" }) {
  return <Link className={cx(buttonClass(tone, size), className)} {...rest} />;
}

/* ---------- Pills: pale tint, dark text of the same hue ---------- */

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "pos" | "neg" | "warn" | "ink"; children: ReactNode }) {
  const t = {
    neutral: "bg-raised text-muted",
    pos: "bg-pos-bg text-pos-ink",
    neg: "bg-neg-bg text-neg-ink",
    warn: "bg-warn-bg text-warn-ink border border-warn-line",
    ink: "bg-text text-paper",
  }[tone];
  return <span className={cx("inline-flex h-5 flex-none items-center whitespace-nowrap rounded-[var(--radius-chip)] px-1.5 text-xs font-medium", t)}>{children}</span>;
}

/* ---------- Page header: a noun title, one grey sentence, real actions only ---------- */

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1>{title}</h1>
        {sub ? <p className="mt-1 text-[15px] leading-[22px] text-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ---------- Panel with a header row ---------- */

export function Panel({
  title,
  meta,
  action,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding (lists that run to the panel edge). */
  flush?: boolean;
}) {
  return (
    <section className={cx("panel", className)}>
      {title ? (
        <div className="flex min-h-[52px] items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="truncate">{title}</h2>
            {meta ? <span className="truncate text-xs text-muted">{meta}</span> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={flush ? "" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

/* ---------- States (app rules §11) ---------- */

/** Loading: a flat grey bar at the real size of what will land there. */
export function Skel({ w = "100%", h = 14, className }: { w?: number | string; h?: number; className?: string }) {
  return <span aria-hidden="true" className={cx("block rounded-[3px] bg-raised", className)} style={{ width: w, height: h }} />;
}

export function EmptyLine({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-control px-4 py-2.5 text-muted">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function ErrorLine({ error, at, retry }: { error: Error; at?: number; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <AlertTriangleIcon size={16} className="text-neg" />
      <span>
        {error.message}
        {at ? <span className="text-muted"> Last updated {clock(new Date(at))}.</span> : null}
      </span>
      <button type="button" onClick={retry} className="font-medium underline underline-offset-4">
        Try again
      </button>
    </div>
  );
}

/** "Updated 14:02 · Refresh" — what's on screen is live, and how live. */
export function Freshness({ at, loading, onRefresh }: { at?: number; loading: boolean; onRefresh: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      {at ? <span>Updated {ago(new Date(at).toISOString())}</span> : null}
      <button type="button" onClick={onRefresh} disabled={loading} className="font-medium text-text underline-offset-4 hover:underline disabled:text-faint">
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </span>
  );
}

/* ---------- Toast (one at a time, bottom of the screen, above the phone nav) ---------- */

interface ToastState {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}
let toast: ToastState | null = null;
let toastTimer: number | undefined;
const toastListeners = new Set<() => void>();

export function showToast(text: string, action?: ToastState["action"], ms = 6000) {
  toast = { id: Date.now(), text, ...(action ? { action } : {}) };
  for (const l of toastListeners) l();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast = null;
    for (const l of toastListeners) l();
  }, ms);
}

export function Toaster() {
  const t = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toast,
    () => null,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6">
      {t ? (
        <div key={t.id} className="toast pointer-events-auto flex max-w-md items-center gap-4 rounded-[var(--radius-card)] bg-text px-4 py-3 text-sm text-paper shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <span>{t.text}</span>
          {t.action ? (
            <button
              type="button"
              className="font-bold text-yellow underline-offset-4 hover:underline"
              onClick={() => {
                t.action!.run();
                toast = null;
                for (const l of toastListeners) l();
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
