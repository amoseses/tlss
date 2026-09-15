// Replaces AmbientNetwork's dots-connected-by-lines look (flagged as
// reading like generic "AI product" clip art) with a perspective grid
// floor receding into the distance plus a few soft drifting glow orbs --
// closer to the reference screenshots (a lit grid floor with molecule-like
// shapes floating above it), reinterpreted in GIVIT's neon-orange/amber
// palette and without literal molecule/science imagery. Pure CSS (a
// perspective-transformed repeating grid background + blurred radial
// glows), no canvas/WebGL, consistent with the rest of the site's
// hand-rolled CSS animation approach.
type Orb = { left: string; top: string; size: number; color: string; delay: string; duration: string };

const ORBS: Orb[] = [
  { left: "8%", top: "18%", size: 90, color: "var(--givit-ember)", delay: "0s", duration: "9s" },
  { left: "82%", top: "12%", size: 60, color: "var(--chart-3)", delay: "1.4s", duration: "11s" },
  { left: "62%", top: "58%", size: 46, color: "var(--givit-ember)", delay: "2.8s", duration: "8s" },
  { left: "22%", top: "62%", size: 34, color: "var(--chart-3)", delay: "0.7s", duration: "10s" },
  { left: "94%", top: "48%", size: 26, color: "var(--givit-coral)", delay: "2s", duration: "7.5s" },
];

export function AmbientGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="ambient-grid-floor" />
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className="ambient-grid-orb animate-float"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle at 35% 30%, ${orb.color}, transparent 70%)`,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
            filter: `drop-shadow(0 0 ${Math.round(orb.size / 4)}px ${orb.color})`,
          }}
        />
      ))}
    </div>
  );
}
