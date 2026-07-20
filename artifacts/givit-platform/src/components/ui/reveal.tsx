import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals a section the first time it scrolls into view. "fade" is the
 * original slide-up-and-fade; "triangle" instead wipes the section in via
 * an animated clip-path (a diagonal triangular reveal) for a sleeker,
 * more startup-y entrance on sections that want to stand out more.
 * Lightweight alternative to a full animation library for simple
 * one-shot entrance reveals.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  variant = "fade",
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: "fade" | "triangle";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect reduced-motion preference: show immediately, no animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style =
    variant === "triangle"
      ? {
          opacity: visible ? 1 : 0,
          clipPath: visible ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 0 0, 0 100%, 0 100%)",
          transition: `clip-path 0.75s cubic-bezier(0.65, 0, 0.35, 1) ${delayMs}ms, opacity 0.4s ease ${delayMs}ms`,
        }
      : {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.6s ease ${delayMs}ms, transform 0.6s ease ${delayMs}ms`,
        };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
