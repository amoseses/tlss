import { useEffect, useRef, useState } from "react";

// Tracks how far the viewport has scrolled through a tall section, as a
// continuous 0 (top of the section just reaching the top of the viewport)
// to 1 (bottom of the section reaching the bottom of the viewport) value --
// for driving scroll-linked transforms (a rotation, an opacity, a step
// index) rather than the one-shot "reveal once when it enters view"
// animations Reveal already handles elsewhere on the site.
//
// Polls via requestAnimationFrame instead of a scroll listener: native
// scroll events fire in bursts that need manual throttling to avoid
// layout thrashing, while rAF already caps updates to the display's
// refresh rate and pauses automatically on a hidden tab.
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    function measure() {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const scrolled = -rect.top;
        const next = scrollable > 0 ? Math.min(1, Math.max(0, scrolled / scrollable)) : 0;
        setProgress((prev) => (Math.abs(prev - next) > 0.0005 ? next : prev));
      }
      raf = requestAnimationFrame(measure);
    }
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { ref, progress };
}
