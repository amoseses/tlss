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
export function GiftBox3D({ size = 56, className = "" }: { size?: number; className?: string }) {
  const half = size / 2;
  const ribbonWidth = Math.max(4, Math.round(size * 0.16));
  const loopWidth = size * 0.34;
  const loopHeight = Math.max(6, size * 0.13);
  const knotSize = Math.max(7, size * 0.17);

  const faceBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: size,
    height: size,
    backfaceVisibility: "hidden",
  };

  const verticalRibbon = (
    <div className="absolute inset-y-0 bg-white/90" style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
  );
  const crossRibbon = (
    <>
      <div className="absolute inset-x-0 bg-white/90" style={{ top: half - ribbonWidth / 2, height: ribbonWidth }} />
      <div className="absolute inset-y-0 bg-white/90" style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
    </>
  );

  return (
    <div className={`animate-rotate-3d relative ${className}`} style={{ width: size, height: size }}>
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
        <div
          className="absolute rounded-full border-2 border-white bg-white/40"
          style={{
            left: half - loopWidth, top: half - loopHeight / 2,
            width: loopWidth, height: loopHeight,
            transform: "translateZ(7px) rotateZ(-22deg) rotateY(25deg)",
            transformOrigin: "100% 50%",
          }}
        />
        <div
          className="absolute rounded-full border-2 border-white bg-white/40"
          style={{
            left: half, top: half - loopHeight / 2,
            width: loopWidth, height: loopHeight,
            transform: "translateZ(7px) rotateZ(22deg) rotateY(-25deg)",
            transformOrigin: "0% 50%",
          }}
        />
        <div
          className="absolute rounded-full bg-white shadow-sm"
          style={{ left: half - knotSize / 2, top: half - knotSize / 2, width: knotSize, height: knotSize, transform: "translateZ(9px)" }}
        />
      </div>
      {/* bottom */}
      <div className="bg-givit-ember-hover rounded-md" style={{ ...faceBase, transform: `rotateX(-90deg) translateZ(${half}px)` }} />
    </div>
  );
}
