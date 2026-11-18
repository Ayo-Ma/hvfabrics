import { useId } from "react";
import { formatMoney, multiply, unitLabel, type Money, type Unit } from "@hv/core";
import { MinusIcon, PlusIcon } from "@hv/ui";

/**
 * The yard picker, drawn as a tailor's tape. A native range input sits on top,
 * so drag, tap, arrow keys and screen readers all work; the stepper buttons give
 * exact control for thumbs. Length, price and what's left update together.
 */
export function YardTape({
  value,
  onChange,
  available,
  unit,
  unitPrice,
}: {
  value: number;
  onChange: (n: number) => void;
  available: number;
  unit: Unit;
  unitPrice: Money;
}) {
  const id = useId();
  const max = Math.max(1, Math.min(available, 30));
  const total = multiply(unitPrice, value);
  const every = max <= 12 ? 1 : 5;
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);
  const set = (n: number) => onChange(Math.min(max, Math.max(1, n)));
  // The input runs 0..max like the drawn tape, so the marker sits exactly on the fill edge; 0 clamps to 1.
  const pct = (n: number) => (n / max) * 100;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <label htmlFor={id} className="font-display text-4xl font-black tracking-(--tracking-display)">
          <span className="tabular">{value}</span> {unitLabel(unit, value)}
        </label>
        <p className="tabular pb-1 text-xl font-semibold" aria-live="polite">
          {formatMoney(total)}
        </p>
      </div>

      <div className="relative mt-4 h-[76px] select-none">
        {/* The tape */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          viewBox="0 0 100 76"
          preserveAspectRatio="none"
        >
          <rect x="0" y="8" width="100" height="40" className="fill-yellow" />
          <rect x={pct(value)} y="8" width={100 - pct(value)} height="40" className="fill-grey-100" />
          {ticks.map((t) => (
            <line
              key={t}
              x1={pct(t)}
              x2={pct(t)}
              y1="8"
              y2={t % every === 0 ? 30 : 20}
              className="stroke-ink"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {/* Numbers in HTML so they don't stretch with the tape */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[54px] h-5">
          {ticks
            .filter((t) => t > 0 && t % every === 0)
            .map((t) => (
              <span
                key={t}
                className="tabular absolute -translate-x-1/2 text-[15px] font-medium text-ink"
                style={{ left: `${pct(t)}%` }}
              >
                {t}
              </span>
            ))}
        </div>
        <input
          id={id}
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-valuetext={`${value} ${unitLabel(unit, value)}, ${formatMoney(total)}`}
          className="tape-range absolute inset-0 size-full cursor-pointer appearance-none bg-transparent"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            className="grid size-12 place-items-center bg-grey-100 transition-colors hover:bg-grey-200 disabled:text-grey-300"
            onClick={() => set(value - 1)}
            disabled={value <= 1}
            aria-label={`One ${unitLabel(unit, 1)} less`}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className="grid size-12 place-items-center bg-grey-100 transition-colors hover:bg-grey-200 disabled:text-grey-300"
            onClick={() => set(value + 1)}
            disabled={value >= max}
            aria-label={`One ${unitLabel(unit, 1)} more`}
          >
            <PlusIcon />
          </button>
        </div>
        <p className="tabular text-[15px] text-grey-600">
          {formatMoney(unitPrice)} per {unitLabel(unit, 1)} · {available} {unitLabel(unit, available)} left
        </p>
      </div>
      {available > 30 && (
        <p className="mt-2 text-[15px] text-grey-600">Need more than 30? Add 30, then add again from the bag.</p>
      )}
    </div>
  );
}
