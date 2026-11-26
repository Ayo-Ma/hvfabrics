import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";
import { ChevronDownIcon, CheckIcon } from "./icons/index";

export interface ListboxOption<V extends string> {
  value: V;
  label: string;
  /** A second, quieter line under the label. */
  hint?: string;
}

/**
 * The shop's own dropdown, in place of the browser's <select>: same keyboard behaviour (arrows,
 * Home/End, type to jump, Enter/Space to choose, Escape to close) and the ARIA listbox pattern, so
 * screen readers announce it like a select. With `name`, a hidden input carries the value in forms.
 * It brings structure only: each app styles it through the class props and the data attributes
 * (`data-open` on the root, `data-active` and `aria-selected` on options).
 */
export function Listbox<V extends string>({
  value,
  onChange,
  options,
  label,
  hideLabel = false,
  name,
  prefix,
  className,
  labelClassName,
  buttonClassName,
  listClassName,
  optionClassName,
  align = "start",
  disabled = false,
}: {
  value: V;
  onChange: (value: V) => void;
  options: readonly ListboxOption<V>[];
  label: string;
  hideLabel?: boolean;
  name?: string;
  /** Shown before the chosen label inside the button, e.g. "Sort:". */
  prefix?: ReactNode;
  className?: string;
  labelClassName?: string;
  buttonClassName?: string;
  listClassName?: string;
  optionClassName?: string;
  align?: "start" | "end";
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in sight by scrolling the list only. scrollIntoView would also pan
  // the page (and on phones the visual viewport), which shifts anything fixed, like a dialog.
  useEffect(() => {
    const ul = list.current;
    const el = ul?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !ul || !el) return;
    if (el.offsetTop < ul.scrollTop) ul.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = el.offsetTop + el.offsetHeight - ul.clientHeight;
  }, [open, active]);

  const show = (at = selectedIndex) => {
    setActive(at);
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    button.current?.focus();
  };
  /** `at` is the key event's own timestamp: keys pressed within 0.7 s build one search. */
  const jumpTo = (key: string, now: number) => {
    typed.current = { text: now - typed.current.at < 700 ? typed.current.text + key.toLowerCase() : key.toLowerCase(), at: now };
    const from = typed.current.text.length > 1 ? active : active + 1;
    for (let k = 0; k < options.length; k++) {
      const i = (from + k) % options.length;
      if (options[i]!.label.toLowerCase().startsWith(typed.current.text)) return i;
    }
    return -1;
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show(e.key === "ArrowUp" ? Math.max(0, selectedIndex - 1) : selectedIndex);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const i = jumpTo(e.key, e.timeStamp);
      if (i >= 0) onChange(options[i]!.value);
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((a) => Math.min(last, a + 1)),
      ArrowUp: () => setActive((a) => Math.max(0, a - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      PageDown: () => setActive((a) => Math.min(last, a + 5)),
      PageUp: () => setActive((a) => Math.max(0, a - 5)),
      Enter: () => choose(active),
      " ": () => choose(active),
      Escape: () => {
        setOpen(false);
        button.current?.focus();
      },
      Tab: () => setOpen(false),
    };
    const run = keys[e.key];
    if (run) {
      if (e.key !== "Tab") e.preventDefault();
      run();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const i = jumpTo(e.key, e.timeStamp);
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={root} className={cx("hv-listbox relative", className)} data-open={open || undefined}>
      <span id={`${id}-label`} className={cx(hideLabel ? "sr-only" : "hv-listbox-label", labelClassName)}>
        {label}
      </span>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={button}
        id={`${id}-button`}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-button`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className={cx("hv-listbox-button inline-flex items-center justify-between gap-2 text-left", buttonClassName)}
      >
        <span className="min-w-0 truncate">
          {prefix ? <span className="hv-listbox-prefix">{prefix} </span> : null}
          {selected?.label}
        </span>
        <ChevronDownIcon size={18} className={cx("shrink-0 transition-transform duration-150", open && "rotate-180")} />
      </button>
      <ul
        ref={list}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        aria-labelledby={`${id}-label`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onKeyDown={onListKey}
        onBlur={(e) => {
          if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={cx("hv-listbox-list absolute z-40 mt-2 max-h-80 min-w-full overflow-auto outline-none", align === "end" ? "right-0" : "left-0", listClassName)}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${id}-opt-${i}`}
            data-index={i}
            role="option"
            aria-selected={o.value === value}
            data-active={i === active || undefined}
            onPointerMove={() => setActive(i)}
            onClick={() => choose(i)}
            className={cx("hv-listbox-option flex cursor-pointer items-center justify-between gap-4", optionClassName)}
          >
            <span className="min-w-0">
              <span className="block">{o.label}</span>
              {o.hint ? <span className="hv-listbox-hint block">{o.hint}</span> : null}
            </span>
            <CheckIcon size={16} className={cx("shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
          </li>
        ))}
      </ul>
    </div>
  );
}
