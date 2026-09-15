import { useEffect, useRef } from "react";

// A canvas-based falling-particle field -- the "Matrix digital rain" idea
// (continuous streaks falling with a fading trail), reinterpreted in
// GIVIT's own ember/amber palette rather than literal green code. Canvas
// instead of CSS/SVG here specifically because a trailing-fade look needs
// per-frame control over how much of the previous frame bleeds through
// (a translucent fillRect each tick), which isn't something CSS keyframes
// can express -- everything else ambient on the site stays hand-rolled
// CSS/SVG on purpose, this is the one exception where canvas is the right
// tool. No external particle library: a few dozen particles is simple
// enough to hand-roll and keeps this dependency-free.
type Particle = { x: number; y: number; speed: number; length: number; opacity: number; hue: "ember" | "amber" };

const PARTICLE_COUNT = 70;
const EMBER_RGB = "255, 90, 61"; // --givit-ember
const AMBER_RGB = "255, 176, 0"; // --chart-3

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
      p.speed = 40 + Math.random() * 90;
      p.length = 10 + Math.random() * 22;
      p.opacity = 0.25 + Math.random() * 0.55;
      p.hue = Math.random() < 0.6 ? "ember" : "amber";
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
      const p: Particle = { x: 0, y: 0, speed: 0, length: 0, opacity: 0, hue: "ember" };
      spawn(p);
      p.y = Math.random() * height; // scattered on first paint, not all clustered above frame 0
      particles.push(p);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    if (reduceMotion) {
      // Static scatter, no animation loop at all.
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.strokeStyle = `rgba(${p.hue === "ember" ? EMBER_RGB : AMBER_RGB}, ${p.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.length);
        ctx.stroke();
      }
      return () => resizeObserver.disconnect();
    }

    let frame: number;
    let lastTime = performance.now();
    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // A translucent (not full-alpha) clear leaves a short fading trail
      // behind each streak instead of a hard-edged line, which is most of
      // what actually reads as "digital rain" rather than static confetti.
      ctx!.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx!.fillRect(0, 0, width, height);

      for (const p of particles) {
        ctx!.strokeStyle = `rgba(${p.hue === "ember" ? EMBER_RGB : AMBER_RGB}, ${p.opacity})`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x, p.y + p.length);
        ctx!.stroke();

        p.y += p.speed * dt;
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
