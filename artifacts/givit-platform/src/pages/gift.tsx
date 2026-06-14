import { GiftFinderChat } from "@/components/gift/gift-finder-chat";
import { Sparkles } from "lucide-react";

export default function GiftFinderPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-b from-givit-mist to-givit-page">
      <div className="container py-8 md:py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-givit-ember/10 border border-givit-coral/20 px-3 py-1.5 text-xs font-semibold text-givit-ember">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Find the perfect gift.
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            Tell us about the person — their interests, your budget, the occasion.
            Our AI does the rest in seconds.
          </p>
        </div>

        <GiftFinderChat />

        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Gift for mom who loves cooking, under $60",
              "Birthday gift for a 10-year-old boy",
              "Anniversary gift for husband, $100 budget",
              "Eco-friendly gift for a friend",
              "Last-minute gift for coworker",
            ].map((prompt) => (
              <span key={prompt} className="tag-pill text-xs">{prompt}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
