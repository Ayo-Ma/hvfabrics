import { Link, type LinkProps } from "react-router";
import type { ComponentPropsWithRef } from "react";
import { cx } from "@hv/ui";

/** One button shape on the whole site: square corners, flat fill. Yellow is for the single primary action. */
type Variant = "primary" | "ink" | "paper" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-yellow text-ink hover:bg-yellow-press",
  ink: "bg-ink text-paper hover:bg-grey-800",
  paper: "bg-paper text-ink hover:bg-grey-100",
  quiet: "bg-transparent text-current underline underline-offset-4 hover:no-underline px-0",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-[background-color,transform] duration-(--duration-fast) active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-grey-200 disabled:text-grey-500";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return <button className={cx(base, styles[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={cx(base, styles[variant], className)} {...props} />;
}
