import { useEffect, useRef } from "react";

/**
 * A fixed, site-wide background layer that drifts as the page scrolls --
 * mounted once at the app shell so every route gets it for free, instead
 * of each page needing its own scroll-linked decoration. Deliberately
 * subtle (low opacity, slow drift): this sits behind real content on
 * pages people actually work in (People, Marketplace, Admin), so it
 * needs to read as ambient atmosphere, never compete with or distract
 * from what's on screen.
 *
 * Reads scrollY directly via rAF rather than useScrollProgress -- that
 * hook measures progress through one specific tall section; this wants
 * the whole document's scroll position, valid on every page regardless
 * of that page's own height.
 */
export function AmbientScrollBackground() {
  const blobARef = useRef<HTMLDivElement>(null);
  const blobBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    function update() {
      const y = window.scrollY;
      if (blobARef.current) blobARef.current.style.transform = `translate3d(0, ${y * 0.06}px, 0)`;
      if (blobBRef.current) blobBRef.current.style.transform = `translate3d(0, ${-y * 0.04}px, 0)`;
      raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={blobARef}
        className="absolute -left-32 top-[10%] h-[560px] w-[560px] rounded-full bg-givit-ember/[0.07] blur-3xl dark:bg-givit-ember/[0.1]"
      />
      <div
        ref={blobBRef}
        className="absolute -right-32 top-[55%] h-[520px] w-[520px] rounded-full bg-givit-coral/[0.06] blur-3xl dark:bg-givit-coral/[0.09]"
      />
    </div>
  );
}
