import { GiftFinderChat } from "@/components/gift/gift-finder-chat";

export default function GiftFinderPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-b from-givit-mist to-givit-page">
      <div className="container py-8 md:py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Givit AI — Gift Finder
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-xl">
            Describe who you're buying for and we'll find the right gift in seconds. The more detail you give, the better the match.
          </p>
        </div>
        <GiftFinderChat />
      </div>
    </div>
  );
}
