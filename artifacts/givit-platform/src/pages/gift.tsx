import { GiftFinderChat } from "@/components/gift/gift-finder-chat";
import { useSearchParams } from "@/lib/hooks/use-search-params";
import { AmbientParticles } from "@/components/ui/ambient-particles";

export default function GiftFinderPage() {
  const { get } = useSearchParams();
  const initialQuery = get("q");

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-b from-givit-mist to-givit-page">
      <div className="container py-8 md:py-12">
        {/* Same dark instrument-panel hero as every other main page --
            this was the one page still on a plain light gradient with no
            ambient treatment at all, which read as visually disconnected
            from the rest of the site. The chat panel itself stays on its
            own light card below, unchanged -- an active reading/typing
            surface wants a calm background, not particles behind the text. */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-black p-8 text-center text-white shadow-xl md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-givit-coral/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-10 h-72 w-72 rounded-full bg-givit-ember/20 blur-3xl" />
          <AmbientParticles />
          <div className="relative">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-givit-coral">GIVIT</p>
            <h1 className="font-serif text-3xl font-bold md:text-4xl">
              Your Gift AI
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/60">
              Tell it who, what for, and how much — it reasons through the catalog and shows its work.
            </p>
          </div>
        </section>
        <GiftFinderChat initialQuery={initialQuery} />
      </div>
    </div>
  );
}
