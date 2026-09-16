import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type TourStep = {
  /** Element id to scroll to and spotlight. Omit for a centered intro/closing card with no highlight. */
  targetId?: string;
  title: string;
  body: string;
};

// A real product-tour overlay: scrolls to and spotlights an actual element
// on the current page (via a CSS box-shadow "cutout" -- a transparent hole
// the size of the target with a dark fill covering everything else, no
// canvas/SVG masking needed) rather than a static card describing features
// in the abstract. Re-measures on scroll/resize while a step is active so
// the cutout tracks the real element instead of drifting out of sync.
export function SiteTour({ steps, onFinish }: { steps: TourStep[]; onFinish: (completed: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index]!;

  useEffect(() => {
    if (!step.targetId) {
      setRect(null);
      return;
    }
    const el = document.getElementById(step.targetId);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    function measure() {
      const target = document.getElementById(step.targetId!);
      if (target) setRect(target.getBoundingClientRect());
    }
    // Scrolling into view is animated -- measuring immediately would catch
    // the element mid-flight, so this keeps re-measuring for the duration
    // of a typical smooth-scroll rather than guessing one fixed delay.
    const interval = window.setInterval(measure, 100);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 900);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", measure);
    };
  }, [index, step.targetId]);

  function next() {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else onFinish(true);
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label="GIVIT tour">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl transition-all duration-300 ease-out"
          style={{
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20,
            boxShadow: "0 0 0 2px var(--givit-ember), 0 0 0 9999px rgba(0,0,0,0.78)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/78" />
      )}

      <div className="fixed inset-x-0 bottom-6 z-[71] flex justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">
              Step {index + 1} of {steps.length}
            </p>
            <button
              type="button"
              aria-label="Skip tour"
              onClick={() => onFinish(false)}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-givit-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="mt-1.5 font-serif text-lg font-bold text-givit-ink">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => onFinish(false)} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
              Skip tour
            </button>
            <button type="button" onClick={next} className="rounded-full bg-givit-ember px-5 py-2 text-xs font-bold text-white hover:bg-givit-ember-hover">
              {index === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
