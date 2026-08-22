import { GiftFinderChat } from "@/components/gift/gift-finder-chat";
import { useSearchParams } from "@/lib/hooks/use-search-params";

export default function GiftFinderPage() {
  const { get } = useSearchParams();
  const initialQuery = get("q");

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-b from-givit-mist to-givit-page">
      <div className="container py-8 md:py-12">
        <div className="mb-8 text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            <span className="text-givit-ember">GIVIT</span>
            <span>MODEL GIVIT&#8209;3</span>
            <span className="inline-flex items-center gap-1.5 text-givit-ember"><span className="tech-dot" /> SESSION LIVE</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Your Gift AI
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Tell it who, what for, and how much — it reasons through the catalog and shows its work.
          </p>
        </div>
        <GiftFinderChat initialQuery={initialQuery} />
      </div>
    </div>
  );
}
