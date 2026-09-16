import { useEffect, useRef } from "react";

// A canvas-based falling-particle field: thin fluttering ribbon curves
// (most particles) with the occasional small bow accent, in GIVIT's own
// ember/amber palette. Evolved from a straight-line "digital rain" look
// into something explicitly gift-themed per feedback -- kept deliberately
// minimal and line-based (thin strokes, no filled cartoon shapes) rather
// than a literal bow icon, since a heavier/filled shape was what read as
// goofy/toy-like in earlier review. Canvas instead of CSS/SVG specifically
// because the trailing-fade look needs per-frame control over how much of
// the previous frame bleeds through (a translucent fillRect each tick),
// which CSS keyframes can't express -- everything else ambient on the
// site stays hand-rolled CSS/SVG on purpose, this is the one exception.
// No external particle library: a few dozen particles is simple enough to
// hand-roll and keeps this dependency-free.
type Particle = {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  hue: "ember" | "amber";
  swayAmount: number;
  swayPhase: number;
  swaySpeed: number;
  isBow: boolean;
};

const PARTICLE_COUNT = 55;
const BOW_FRACTION = 0.16; // most particles are ribbon streaks; a few are small bow accents
const EMBER_RGB = "255, 90, 61"; // --givit-ember
const AMBER_RGB = "255, 176, 0"; // --chart-3

// A gradient stroke (transparent -> bright -> transparent along the
// ribbon's own length) plus a soft shadowBlur glow, rather than a flat
// solid-color line -- this is what actually reads as "holographic sheen"
// rather than a plain colored streak. shadowBlur is reset immediately
// after stroking so it doesn't bleed into the next frame's trail-fade
// fillRect.
function drawRibbon(ctx: CanvasRenderingContext2D, p: Particle, rgb: string) {
  const sway = Math.sin(p.swayPhase) * p.swayAmount;
  const x1 = p.x;
  const y1 = p.y + p.length;
  const gradient = ctx.createLinearGradient(p.x, p.y, x1, y1);
  gradient.addColorStop(0, `rgba(${rgb}, 0)`);
  gradient.addColorStop(0.5, `rgba(${rgb}, ${p.opacity})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.strokeStyle = gradient;
  ctx.shadowColor = `rgba(${rgb}, ${p.opacity * 0.7})`;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  // A gentle S-curve rather than a straight line -- this alone is most of
  // what reads as "fluttering ribbon" instead of "falling rain streak".
  ctx.quadraticCurveTo(p.x + sway, p.y + p.length / 2, x1, y1);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Two thin open loops meeting at a small center knot -- stroked, not
// filled, and sized to match the ribbon streaks around it, so it reads as
// a delicate accent in the same field rather than a standalone icon.
function drawBow(ctx: CanvasRenderingContext2D, p: Particle) {
  const size = p.length * 0.9;
  const rotation = Math.sin(p.swayPhase) * 0.5;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(-size * 0.42, 0, size * 0.42, size * 0.24, 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(size * 0.42, 0, size * 0.42, size * 0.24, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  ctx.restore();
}

export function AmbientParticles({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const particles: Particle[] = [];

    function spawn(p: Particle) {
      p.x = Math.random() * width;
      p.y = -20 - Math.random() * height;
      p.speed = 26 + Math.random() * 46;
      p.length = 14 + Math.random() * 20;
      p.opacity = 0.22 + Math.random() * 0.48;
      p.hue = Math.random() < 0.6 ? "ember" : "amber";
      p.swayAmount = 6 + Math.random() * 14;
      p.swayPhase = Math.random() * Math.PI * 2;
      p.swaySpeed = 0.8 + Math.random() * 1.4;
      p.isBow = Math.random() < BOW_FRACTION;
    }

    function resize() {
      width = parent!.clientWidth;
      height = parent!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p: Particle = {
        x: 0, y: 0, speed: 0, length: 0, opacity: 0, hue: "ember",
        swayAmount: 0, swayPhase: 0, swaySpeed: 0, isBow: false,
      };
      spawn(p);
      p.y = Math.random() * height; // scattered on first paint, not all clustered above frame 0
      particles.push(p);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    function draw(p: Particle) {
      const rgb = p.hue === "ember" ? EMBER_RGB : AMBER_RGB;
      ctx!.strokeStyle = `rgba(${rgb}, ${p.opacity})`;
      ctx!.lineWidth = 1.4;
      if (p.isBow) drawBow(ctx!, p);
      else drawRibbon(ctx!, p, rgb);
    }

    if (reduceMotion) {
      // Static scatter, no animation loop at all.
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) draw(p);
      return () => resizeObserver.disconnect();
    }

    let frame: number;
    let lastTime = performance.now();
    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // A translucent (not full-alpha) clear leaves a short fading trail
      // behind each particle instead of a hard-edged shape, which is most
      // of what makes this read as "falling" rather than static confetti.
      ctx!.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx!.fillRect(0, 0, width, height);

      for (const p of particles) {
        draw(p);
        p.y += p.speed * dt;
        p.swayPhase += p.swaySpeed * dt;
        if (p.y - p.length > height) spawn(p);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
