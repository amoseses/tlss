import { GiftFinderChat } from "@/components/gift/gift-finder-chat";
import { useSearchParams } from "@/lib/hooks/use-search-params";

export default function GiftFinderPage() {
  const { get } = useSearchParams();
  const initialQuery = get("q");

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-b from-givit-mist to-givit-page">
      <div className="container py-8 md:py-12">
        <div className="mb-8 text-center">
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
