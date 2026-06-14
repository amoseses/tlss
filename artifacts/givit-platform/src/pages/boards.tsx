import { useState } from "react";
import { Link } from "wouter";
import { Bookmark, Grid3X3, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { GIFT_COLLECTIONS, MARKETPLACE_PRODUCTS, MARKETPLACE_RATINGS } from "@/lib/data/marketplace";
import { ProductCard } from "@/components/product/product-card";

export default function BoardsPage() {
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const [activeBoard, setActiveBoard] = useState(GIFT_COLLECTIONS[0]?.slug ?? "");

  const board = GIFT_COLLECTIONS.find((c) => c.slug === activeBoard) ?? GIFT_COLLECTIONS[0];
  const boardProducts = board
    ? MARKETPLACE_PRODUCTS.filter((p) => board.productSlugs.includes(p.slug) || p.interests.some((i) => board.query.toLowerCase().includes(i))).slice(0, 8)
    : MARKETPLACE_PRODUCTS.slice(0, 8);

  return (
    <PageShell wide>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Curated collections</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Gift boards</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">Themed collections of the best gifts for every occasion and interest.</p>
        </div>
        <Button className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
          <Plus className="h-4 w-4" /> Create board
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <div className="givit-section space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Collections</p>
            {GIFT_COLLECTIONS.map((col) => (
              <button
                key={col.slug}
                type="button"
                onClick={() => setActiveBoard(col.slug)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${activeBoard === col.slug ? "bg-givit-ember/10 font-semibold text-givit-ember" : "hover:bg-muted text-foreground"}`}
              >
                <p className="font-medium">{col.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{col.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <div>
          {board ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4 text-givit-ember" />
                    <h2 className="font-serif text-2xl font-bold text-givit-ink">{board.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Bookmark className="h-4 w-4" /> Save
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {boardProducts.map((p) => {
                  const s = ratings[p.id];
                  const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
                  return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} compact />;
                })}
              </div>
              <div className="mt-6 text-center">
                <Link href={`/products?q=${encodeURIComponent(board.query)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-givit-ember hover:underline">
                  Browse all {board.title} products →
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
