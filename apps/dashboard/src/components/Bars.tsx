import { useEffect, useRef, useState } from "react";

/**
 * Money-in columns (app rules §6): square corners, zero baseline, 4–5 faint gridlines,
 * round y ticks above the maximum, flat x labels on one step. The current period is the
 * one coloured mark: Harries Yellow, edged in ink so it reads on white. Days still to come
 * draw nothing (no invented zeros in the future). Tapping or hovering a column names it.
 */

export interface Bar {
  key: string;
  /** Short x label ("Mon", "13", "14:00"). */
  label: string;
  /** Spoken/hover label ("Friday 13 November"). */
  long: string;
  value: number;
  orders: number;
  /** Part of the period the screen is about (drawn in the one hue). */
  current: boolean;
  /** The bucket we're in right now (label in bold). */
  now: boolean;
  future: boolean;
}

function niceStep(max: number, ticks = 4): number {
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

/** ₦ ticks from kobo: 0, ₦50k, ₦1.5m. */
function tick(kobo: number): string {
  const n = kobo / 100;
  if (n === 0) return "₦0";
  if (n >= 1_000_000) return `₦${+(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `₦${+(n / 1_000).toFixed(1)}k`;
  return `₦${n}`;
}

export function Bars({
  bars,
  labelEvery,
  height = 200,
  describe,
  summary,
}: {
  bars: Bar[];
  labelEvery: number;
  height?: number;
  describe: (b: Bar) => string;
  /** Shown above the chart until a column is picked. */
  summary: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(0, ...bars.map((b) => b.value));
  const step = max === 0 ? 1_000_000 : niceStep(max);
  const top = max === 0 ? step * 4 : Math.ceil((max * 1.0001) / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const left = 48;
  const plotTop = 8;
  const plotBottom = height - 24;
  const plotH = plotBottom - plotTop;
  const plotW = width - left;
  const slot = plotW / bars.length;
  const barW = Math.max(2, Math.min(36, slot * 0.62));
  const y = (v: number) => plotBottom - (v / top) * plotH;

  const currentIndex = bars.findIndex((b) => b.now);
  const shown = bars.find((b) => b.key === hover);

  return (
    <div>
      <p className="num mb-3 min-h-5 text-sm text-muted" aria-live="polite">
        {shown ? describe(shown) : summary}
      </p>
      <div ref={ref} className="w-full">
        <svg width={width} height={height} role="img" aria-label="Money in by period" className="bars block overflow-visible" onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--color-text)" : "var(--color-grid)"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--color-muted)] text-[11px]">
                {tick(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = left + slot * i + slot / 2;
            const h = b.future ? 0 : Math.max(b.value > 0 ? 2 : 0, plotBottom - y(b.value));
            return (
              <g key={b.key}>
                {/* Full-height hit area so a thumb can pick a thin column. */}
                <rect
                  x={left + slot * i}
                  y={plotTop}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(b.key)}
                  onPointerDown={() => setHover(b.key)}
                >
                  <title>{describe(b)}</title>
                </rect>
                {h > 0 ? (
                  <rect
                    x={cx - barW / 2}
                    y={plotBottom - h}
                    width={barW}
                    height={h}
                    data-current={b.current}
                    fill={b.current ? "var(--color-yellow)" : hover === b.key ? "var(--color-text)" : "var(--color-bar)"}
                    stroke={b.current ? "var(--color-text)" : "none"}
                    strokeWidth={b.current ? 1 : 0}
                    shapeRendering="crispEdges"
                    pointerEvents="none"
                  />
                ) : null}
                {b.now || (i % labelEvery === 0 && Math.abs(i - currentIndex) > Math.min(2, labelEvery - 1)) ? (
                  <text
                    x={cx}
                    y={height - 6}
                    textAnchor={i === 0 ? "start" : i === bars.length - 1 ? "end" : "middle"}
                    dx={i === 0 ? -barW / 2 : i === bars.length - 1 ? barW / 2 : 0}
                    className={b.now ? "num fill-[var(--color-text)] text-[11px] font-bold" : "num fill-[var(--color-muted)] text-[11px]"}
                  >
                    {b.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
