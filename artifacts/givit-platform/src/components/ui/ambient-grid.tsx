// Replaces AmbientNetwork's dots-connected-by-lines look (flagged as
// reading like generic "AI product" clip art) with a perspective grid
// floor receding into the distance plus a couple of soft ambient glows --
// closer to the reference screenshots (a lit grid floor with shapes
// floating above it), reinterpreted in GIVIT's neon-orange/amber palette
// without literal molecule/science imagery. Pure CSS, no canvas/WebGL,
// consistent with the rest of the site's hand-rolled CSS animation
// approach.
//
// The glows are the same blur-3xl-blob technique already used for every
// other hero's background glow sitewide (large solid-color circle, heavy
// blur, no hard edge) rather than a smaller sharp-edged circle with a
// drop-shadow ring -- the latter read as a distinct floating "ball"
// rather than ambient light, which is what came across as goofy/toy-like
// in review. Fewer, bigger, softer -- texture, not a decoration you'd
// consciously notice.
type Glow = { left: string; top: string; size: number; color: string; anim: string; delay: string };

const GLOWS: Glow[] = [
  { left: "10%", top: "20%", size: 260, color: "var(--givit-ember)", anim: "animate-drift", delay: "0s" },
  { left: "85%", top: "15%", size: 200, color: "var(--chart-3)", anim: "animate-drift-slow", delay: "1s" },
  { left: "60%", top: "70%", size: 180, color: "var(--givit-ember)", anim: "animate-drift-slow", delay: "2s" },
];

export function AmbientGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="ambient-grid-floor" />
      {GLOWS.map((glow, i) => (
        <div
          key={i}
          className={`ambient-grid-glow ${glow.anim}`}
          style={{
            left: glow.left,
            top: glow.top,
            width: glow.size,
            height: glow.size,
            backgroundColor: glow.color,
            animationDelay: glow.delay,
          }}
        />
      ))}
    </div>
  );
}
