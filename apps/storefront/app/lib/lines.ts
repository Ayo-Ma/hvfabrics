import { LINE_LABELS, type Line } from "@hv/core";

/** URL segment for each product line. */
export const LINE_PATHS: Record<Line, string> = {
  fabric: "/fabrics",
  lingerie: "/lingerie",
  rtw: "/ready-to-wear",
};

export function lineFromPath(pathname: string): Line | undefined {
  const seg = `/${pathname.split("/")[1] ?? ""}`;
  return (Object.keys(LINE_PATHS) as Line[]).find((l) => LINE_PATHS[l] === seg);
}

/**
 * One line per product line saying what's in it. Kept factual until she supplies copy.
 * [TBC] marks text that needs her wording.
 */
export const LINE_INTROS: Record<Line, string> = {
  fabric: "For the outfit people ask about. Silk, satin, chiffon, lace, ankara and more.",
  lingerie: "The part nobody sees, and you feel all day. [TBC: owner to confirm]",
  rtw: "For when the day is close and your tailor is fully booked. [TBC: owner to confirm]",
};

export { LINE_LABELS };
