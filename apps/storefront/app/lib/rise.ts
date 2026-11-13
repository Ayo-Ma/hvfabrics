import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Section entrances: elements with [data-rise] rise once as they enter the viewport.
 * Content is visible without script (the .js class gates the hidden state), and
 * reduced motion skips it entirely (app.css).
 */
export function useRise() {
  const { pathname } = useLocation();
  useEffect(() => {
    (window as { __hvHydrated?: boolean }).__hvHydrated = true;
    const els = [...document.querySelectorAll<HTMLElement>("[data-rise]:not(.is-in)")];
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
}
