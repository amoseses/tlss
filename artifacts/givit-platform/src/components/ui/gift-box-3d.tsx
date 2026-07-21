/**
 * A genuine CSS 3D cube (6 real faces via translateZ), not a flat icon
 * spinning on an axis — a 2D glyph rotated in 3D goes edge-on and either
 * disappears or mirrors at the halfway point, which reads as broken rather
 * than "cool". Each face is a real plane so every angle of the rotation
 * shows an actual box, ribbon included. Every face uses the site's own
 * ember/coral palette (no generic black/gray) so it reads as Givit's box,
 * not a stock 3D primitive.
 */
export function GiftBox3D({ size = 56, className = "" }: { size?: number; className?: string }) {
  const half = size / 2;
  const ribbonWidth = Math.max(4, Math.round(size * 0.16));

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
      {/* top — the cross reads as a wrapped ribbon regardless of which way the box is tilted, unlike a single band that can end up nearly edge-on */}
      <div className="givit-gradient rounded-md" style={{ ...faceBase, transform: `rotateX(90deg) translateZ(${half}px)` }}>
        {crossRibbon}
      </div>
      {/* bottom */}
      <div className="bg-givit-ember-hover rounded-md" style={{ ...faceBase, transform: `rotateX(-90deg) translateZ(${half}px)` }} />
    </div>
  );
}
