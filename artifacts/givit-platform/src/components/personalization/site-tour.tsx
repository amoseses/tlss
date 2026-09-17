import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

export type TourStep = {
  /** Element id to scroll to and spotlight. Omit for a centered intro/closing card with no highlight. */
  targetId?: string;
  title: string;
  body: string;
};

const CARD_WIDTH = 340;
const CARD_MARGIN = 16;

// A real product-tour overlay: scrolls to and spotlights an actual element
// on the current page (via a CSS box-shadow "cutout" -- a transparent hole
// the size of the target with a dark fill covering everything else, no
// canvas/SVG masking needed) rather than a static card describing features
// in the abstract. Re-measures on scroll/resize while a step is active so
// the cutout tracks the real element instead of drifting out of sync.
export function SiteTour({ steps, onFinish }: { steps: TourStep[]; onFinish: (completed: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const step = steps[index]!;

  useEffect(() => {
    // Mount transition (small fade + rise) instead of the card just
    // appearing instantly -- the one-line change that made the old bottom
    // bar feel like it "popped in" like a browser alert rather than part
    // of the product.
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));

    if (!step.targetId) {
      setRect(null);
      return () => cancelAnimationFrame(raf);
    }
    const el = document.getElementById(step.targetId);
    if (!el) {
      setRect(null);
      return () => cancelAnimationFrame(raf);
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
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("resize", measure);
    };
  }, [index, step.targetId]);

  function next() {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else onFinish(true);
  }

  // Anchors the card next to whatever's actually spotlighted instead of
  // pinning it to the bottom of the screen regardless of what step is
  // showing -- a fixed bottom bar reading "Step 2 of 4" while pointing at
  // nothing in particular is the single most "legacy onboarding wizard"
  // tell. Falls back to bottom-center only for intro/closing steps that
  // have no target to sit next to.
  const cardStyle: CSSProperties = rect
    ? (() => {
        const spaceBelow = window.innerHeight - rect.bottom;
        const placeBelow = spaceBelow > 220 || rect.top < 220;
        const left = Math.min(Math.max(rect.left, CARD_MARGIN), window.innerWidth - CARD_WIDTH - CARD_MARGIN);
        return placeBelow
          ? { top: rect.bottom + 16, left }
          : { top: rect.top - 16, left, transform: "translateY(-100%)" };
      })()
    : { bottom: 24, left: "50%", transform: "translateX(-50%)" };

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
            boxShadow: "0 0 0 2px var(--givit-ember), 0 0 0 9999px rgba(0,0,0,0.7)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px]" />
      )}

      <div
        className={`fixed z-[71] w-[calc(100%-2rem)] transition-all duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ ...cardStyle, maxWidth: CARD_WIDTH, transform: `${cardStyle.transform ?? ""} ${visible ? "" : "translateY(6px)"}`.trim() }}
      >
        <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-1.5 pt-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-givit-ember" : "w-1.5 bg-muted"}`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Skip tour"
              onClick={() => onFinish(false)}
              className="-m-1 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-givit-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="mt-2 font-serif text-base font-bold text-givit-ink">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          <div className="mt-3.5 flex items-center justify-between">
            <button type="button" onClick={() => onFinish(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
              Skip
            </button>
            <button type="button" onClick={next} className="rounded-full bg-givit-ember px-4 py-1.5 text-xs font-bold text-white hover:bg-givit-ember-hover">
              {index === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
