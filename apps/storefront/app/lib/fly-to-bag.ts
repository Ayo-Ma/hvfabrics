/**
 * Motion that explains state (PLAN.md): a small swatch travels from the add button
 * to the bag icon. Transform and opacity only; skipped under reduced motion.
 */
export function flyToBag(from: HTMLElement | null): Promise<void> {
  const target = document.querySelector<HTMLElement>("[data-bag-target]");
  if (!from || !target || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("div");
  const size = 18;
  Object.assign(dot.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    background: "var(--color-yellow)",
    outline: "2px solid var(--color-ink)",
    zIndex: "60",
    pointerEvents: "none",
  });
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy - 80}px) scale(0.9)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.2 },
    ],
    { duration: 560, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  return anim.finished.then(() => {
    dot.remove();
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], {
      duration: 260,
      easing: "ease-out",
    });
  });
}
