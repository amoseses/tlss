/**
 * A genuine CSS 3D cube (6 real faces via translateZ), not a flat icon
 * spinning on an axis — a 2D glyph rotated in 3D goes edge-on and either
 * disappears or mirrors at the halfway point, which reads as broken rather
 * than "cool". Each face is a real plane so every angle of the rotation
 * shows an actual box, ribbon included.
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

  return (
    <div
      className={`animate-rotate-3d relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* front */}
      <div className="givit-gradient rounded-md shadow-md" style={{ ...faceBase, transform: `translateZ(${half}px)` }}>
        <div className="absolute inset-y-0 bg-white/85" style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
      </div>
      {/* back */}
      <div className="givit-gradient rounded-md" style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${half}px)` }}>
        <div className="absolute inset-y-0 bg-white/85" style={{ left: half - ribbonWidth / 2, width: ribbonWidth }} />
      </div>
      {/* right */}
      <div className="rounded-md bg-givit-ember-hover" style={{ ...faceBase, transform: `rotateY(90deg) translateZ(${half}px)` }} />
      {/* left */}
      <div className="rounded-md bg-givit-ember-hover" style={{ ...faceBase, transform: `rotateY(-90deg) translateZ(${half}px)` }} />
      {/* top */}
      <div className="givit-gradient rounded-md" style={{ ...faceBase, transform: `rotateX(90deg) translateZ(${half}px)` }}>
        <div className="absolute inset-x-0 bg-white/85" style={{ top: half - ribbonWidth / 2, height: ribbonWidth }} />
      </div>
      {/* bottom */}
      <div className="rounded-md bg-black/30" style={{ ...faceBase, transform: `rotateX(-90deg) translateZ(${half}px)` }} />
    </div>
  );
}
