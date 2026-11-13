import type { ReactNode } from "react";
import { cx } from "@hv/ui";

/** Empty, error and success states, each with its illustration from assets/. */
export function StateMessage({
  illustration,
  title,
  children,
  action,
  headingLevel = 1,
  className,
}: {
  illustration: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className={cx("mx-auto flex max-w-md flex-col items-center px-(--spacing-gutter) py-16 text-center", className)}>
      <img src={illustration} alt="" width={240} height={240} className="size-48 md:size-60" />
      <H className="mt-6 text-2xl">{title}</H>
      {children && <div className="mt-3 text-base text-grey-600">{children}</div>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
