/**
 * A genuine CSS 3D cube (6 real faces via translateZ), not a flat icon
 * spinning on an axis — a 2D glyph rotated in 3D goes edge-on and either
 * disappears or mirrors at the halfway point, which reads as broken rather
 * than "cool". Each face is a real plane so every angle of the rotation
 * shows an actual box. A small bow (two loops + a knot) sits on top with
 * its own translateZ offset so it actually sticks up off the surface
 * instead of just being a flat pattern painted on the top face. Every
 * face uses the site's own ember/coral palette, no generic black/gray.
 */
export function GiftBox3D({
  size = 56,
  className = "",
  rotation,
  glow = 0,
}: {
  size?: number;
  className?: string;
  /** Explicit {x, y} degrees — overrides the default continuous CSS spin
   *  so a scroll position (or anything else) can drive rotation directly
   *  instead of the box spinning on its own fixed timer. */
  rotation?: { x: number; y: number };
  /** 0-1 — blends in a soft ember glow behind the box; purely additive,
   *  the box geometry itself never changes shape. */
  glow?: number;
}) {
  const half = size / 2;
  const ribbonWidth = Math.max(4, Math.round(size * 0.16));
  const loopSize = size * 0.4;
  const loopBorder = Math.max(2, Math.round(size * 0.07));
  const knotSize = Math.max(7, size * 0.17);

  const faceBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: size,
    height: size,
    backfaceVisibility: "hidden",
  };

  // Literal light/dark classes rather than a CSS-variable-based token: this
  // whole component sits inside a continuously-running CSS transform
  // animation (animate-rotate-3d), and elements in a continuously-animated
  // (separately composited) subtree don't reliably repaint custom-property-
  // derived colors when the theme toggles, even though the same token
  // resolves fine on static content elsewhere on the page.
  const ribbonColor = "bg-black dark:bg-white/90";
  const ribbonBorderColor = "border-black dark:border-white/90";

  const verticalRibbon = (
    <div className={`absolute inset-y-0 ${ribbonColor}`} style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
  );
  const crossRibbon = (
    <>
      <div className={`absolute inset-x-0 ${ribbonColor}`} style={{ top: half - ribbonWidth / 2, height: ribbonWidth }} />
      <div className={`absolute inset-y-0 ${ribbonColor}`} style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
    </>
  );

  const controlledStyle: React.CSSProperties | undefined = rotation
    ? { transform: `perspective(600px) rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`, transformStyle: "preserve-3d" }
    : undefined;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {glow > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-givit-ember blur-2xl"
          style={{ inset: -size * 0.6, opacity: glow * 0.45, transition: "opacity 200ms linear" }}
        />
      )}
      <div className={`relative ${rotation ? "" : "animate-rotate-3d"} ${className}`} style={{ width: size, height: size, ...controlledStyle }}>
      {/* front */}
      <div className="givit-gradient rounded-md shadow-md" style={{ ...faceBase, transform: `translateZ(${half}px)` }}>
        {verticalRibbon}
      </div>
      {/* back */}
      <div className="givit-gradient rounded-md" style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${half}px)` }}>
        {verticalRibbon}
      </div>
      {/* right */}
      <div className="bg-givit-ember-hover rounded-md" style={{ ...faceBase, transform: `rotateY(90deg) translateZ(${half}px)` }} />
      {/* left */}
      <div className="bg-givit-ember-hover rounded-md" style={{ ...faceBase, transform: `rotateY(-90deg) translateZ(${half}px)` }} />
      {/* top face + a bow that actually sticks up off the surface */}
      <div style={{ ...faceBase, transform: `rotateX(90deg) translateZ(${half}px)`, transformStyle: "preserve-3d" }}>
        <div className="givit-gradient rounded-md" style={{ position: "absolute", inset: 0 }}>
          {crossRibbon}
        </div>
        {/* left loop — a hollow ring (not a filled pill) attached at its inner
            edge and tilted up/out so it reads as a loop standing off the
            box, not a flat spoke lying on the surface */}
        <div
          className={`absolute rounded-full border-solid ${ribbonBorderColor}`}
          style={{
            left: half - loopSize, top: half - loopSize / 2,
            width: loopSize, height: loopSize,
            borderWidth: loopBorder,
            background: "transparent",
            transform: "translateZ(6px) rotateY(38deg) rotateZ(-14deg)",
            transformOrigin: "100% 50%",
          }}
        />
        {/* right loop (mirrored) */}
        <div
          className={`absolute rounded-full border-solid ${ribbonBorderColor}`}
          style={{
            left: half, top: half - loopSize / 2,
            width: loopSize, height: loopSize,
            borderWidth: loopBorder,
            background: "transparent",
            transform: "translateZ(6px) rotateY(-38deg) rotateZ(14deg)",
            transformOrigin: "0% 50%",
          }}
        />
        <div
          className={`absolute rounded-full shadow-sm ${ribbonColor}`}
          style={{ left: half - knotSize / 2, top: half - knotSize / 2, width: knotSize, height: knotSize, transform: "translateZ(10px)" }}
        />
      </div>
      {/* bottom */}
      <div className="bg-givit-ember-hover rounded-md" style={{ ...faceBase, transform: `rotateX(-90deg) translateZ(${half}px)` }} />
      </div>
    </div>
  );
}
