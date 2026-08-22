import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to `value` once, the first time it scrolls into view --
 * the "instrument reading itself out" motion used throughout the deeptech
 * pass (stat bars, telemetry readouts) instead of a number just sitting
 * there static. Reduced-motion users get the final value immediately.
 */
export function CountUp({ value, duration = 1100, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(valueRef.current);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        const target = valueRef.current;
        const start = performance.now();
        let frame: number;
        function tick(now: number) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(target * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        observer.disconnect();
        return () => cancelAnimationFrame(frame);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    // If the count-up never triggers (element off-screen, observer quirk),
    // the number would otherwise be stuck at 0 forever -- same safety net
    // pattern as Reveal.
    const fallback = window.setTimeout(() => { if (!startedRef.current) setDisplay(valueRef.current); }, 1500);
    return () => { observer.disconnect(); window.clearTimeout(fallback); };
  }, [duration]);

  // Once the animation has finished, keep the displayed number in sync if
  // the underlying value changes later (e.g. a refetch), without replaying
  // the count-up animation a second time.
  useEffect(() => {
    if (startedRef.current) setDisplay(value);
  }, [value]);

  return <span ref={ref} className={className}>{display.toLocaleString()}</span>;
}
