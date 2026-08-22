import { useEffect, useRef, useState } from "react";

/**
 * Types `text` out character by character, once, the first time it scrolls
 * into view, with a blinking cursor while it runs. Reserved for secondary
 * copy that can afford a beat before it's legible -- never a primary
 * heading someone needs to read immediately. Reduced-motion users get the
 * full text instantly.
 */
export function TypewriterText({ text, className, speedMs = 22 }: { text: string; className?: string; speedMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      setDone(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        let i = 0;
        const id = window.setInterval(() => {
          i += 1;
          setShown(i);
          if (i >= text.length) {
            window.clearInterval(id);
            setDone(true);
          }
        }, speedMs);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    // Same safety net as Reveal/CountUp: if the observer never fires, show
    // the full line instead of leaving real copy permanently blank.
    const fallback = window.setTimeout(() => { if (!startedRef.current) { setShown(text.length); setDone(true); } }, 1500);
    return () => { observer.disconnect(); window.clearTimeout(fallback); };
  }, [text, speedMs]);

  return (
    <span ref={ref} className={className}>
      {text.slice(0, shown)}
      <span aria-hidden="true" className={`ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.1em] bg-current align-middle ${done ? "animate-cursor-blink" : "opacity-100"}`} />
    </span>
  );
}
