import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { GIFT_COLLECTIONS } from "@/lib/data/marketplace";

export function GiftBoards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {GIFT_COLLECTIONS.map((collection) => (
        <Link key={collection.slug} href={`/products?q=${encodeURIComponent(collection.query)}`} className="rounded-2xl border border-border/70 bg-card p-5 transition hover:-translate-y-1 hover:border-givit-ember/40 hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-givit-sand"><Sparkles className="h-5 w-5 text-givit-ember" /></div>
          <h3 className="font-serif text-xl font-bold text-givit-ink">{collection.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{collection.description}</p>
        </Link>
      ))}
    </div>
  );
}
