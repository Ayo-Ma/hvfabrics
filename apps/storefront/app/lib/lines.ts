import { LINE_LABELS, type Line } from "@hv/core";

/** URL segment for each product line. */
export const LINE_PATHS: Record<Line, string> = {
  fabric: "/fabrics",
  ankara: "/ankara",
  rtw: "/ready-to-wear",
};

export function lineFromPath(pathname: string): Line | undefined {
  const seg = `/${pathname.split("/")[1] ?? ""}`;
  return (Object.keys(LINE_PATHS) as Line[]).find((l) => LINE_PATHS[l] === seg);
}

/** One line per product line saying what's in it (owner's homepage copy, 2026-11-26). */
export const LINE_INTROS: Record<Line, string> = {
  fabric: "From fluid chiffons and textured jacquards to structured corduroy. Sourced by the yard or in bulk bales for designers, tailors and fabric retailers.",
  ankara: "Vibrant wax prints, rich motifs and fade-resistant cottons that hold crisp pleats and turn heads across every continent.",
  rtw: "Effortless, tailored pieces cut from our finest textiles. Designed for the woman who wants standout style without the wait.",
};

/** What the menu calls each line (owner's copy). */
export const LINE_MENU: Record<Line, string> = {
  fabric: "Shop Fabrics",
  ankara: "Ankara Prints",
  rtw: "Ready-to-Wear",
};

/** Lines cut from the bolt, sold by the yard. */
export const isCloth = (line: Line) => line !== "rtw";

export { LINE_LABELS };
