import Link from "next/link";
import { ArrowRight, Bookmark, Brain, Gift, Search, ShieldCheck, Sparkles, Trophy, Wand2 } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GIFT_COLLECTIONS,
  MARKETPLACE_PRODUCTS,
  MARKETPLACE_RATINGS,
} from "@/lib/data/marketplace";

export default function HomePage() {
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const featured = MARKETPLACE_PRODUCTS.slice(0, 4);
  const tech = MARKETPLACE_PRODUCTS.filter((p) => ["tech", "gaming", "writing", "home"].includes(p.category?.slug ?? "")).slice(0, 8);

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden bg-givit-ink">
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-givit-ember/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-givit-coral/10 blur-3xl" />

        <div className="container relative grid gap-10 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-givit-coral/30 bg-givit-ember/10 px-3 py-1.5 text-xs font-semibold text-givit-coral">
              <Sparkles className="h-3 w-3" />
              Givit AI + free best-item marketplace
            </div>

            <h1 className="font-serif text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              Find your perfect gift.
              <br />
              <span className="italic text-givit-coral">Stop wasting money online.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
              Givit is being built as the perfect gift-giving AI and a Pinterest-style place to save gift ideas all year. Browse the best items from across the web, ranked by Givit instead of brand deals, then click through to the original retailer when you are ready.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-full bg-givit-ember px-6 text-sm font-semibold text-white hover:bg-givit-ember-hover">
                <Link href="/gift">
                  <Wand2 className="h-4 w-4" /> Find your perfect gift <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10">
                <Link href="/products">
                  <Search className="h-4 w-4" /> Browse marketplace
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 text-xs text-white/55 sm:grid-cols-3">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-givit-coral" /> No paid brand ranking</div>
              <div className="flex items-center gap-2"><Bookmark className="h-4 w-4 text-givit-coral" /> Save ideas to wishlists</div>
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-givit-coral" /> Admin-ranked best picks</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-white p-4 text-givit-ink">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Gift match preview</p>
                  <h2 className="font-serif text-2xl font-bold">For a coffee-loving traveler</h2>
                </div>
                <Badge className="bg-givit-ember text-white">96%</Badge>
              </div>
              <div className="space-y-3">
                {MARKETPLACE_PRODUCTS.filter((p) => ["aeropress-clear", "apple-airtags-4-pack", "patagonia-black-hole-duffel"].includes(p.slug)).map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className="flex gap-3 rounded-2xl border border-border/70 p-3 transition hover:border-givit-ember/40 hover:shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-givit-sand text-lg">🎁</div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.price_range} · {product.gift_match_score}% fit</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-givit-sand/40">
        <div className="container grid gap-6 py-10 sm:grid-cols-3">
          {[
            { icon: Brain, title: "AI gift finder next", desc: "The custom LLM flow will ask relationship, occasion, budget, interests, and survey-style questions for high-accuracy matches." },
            { icon: Trophy, title: "Marketplace now", desc: "Products work like Amazon detail pages, but the button sends shoppers to the original product instead of adding to cart." },
            { icon: Bookmark, title: "Pinterest behavior", desc: "People can save products into a local wishlist now, with shareable gift boards and accounts planned next." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white shadow-sm">
                <item.icon className="h-5 w-5 text-givit-ember" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Free marketplace</p>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Ranked, tested, and gift-ready</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A starter catalog across tech, beauty, books, home, food, gaming, pets, art, fitness, and outdoor—ready for admin curation instead of seller influence.</p>
          </div>
          <Link href="/products" className="givit-link text-sm font-medium">Browse all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => {
            const s = ratings[p.id];
            const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
            return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} featured />;
          })}
        </div>
      </section>

      <section className="container py-4 md:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Gift boards</p>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Pinterest for gift giving</h2>
            <p className="mt-1 text-sm text-muted-foreground">Browse collections, save products, and keep gift ideas ready months before you need them.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {GIFT_COLLECTIONS.map((collection) => (
            <Link key={collection.slug} href={`/products?q=${encodeURIComponent(collection.query)}`} className="rounded-3xl border border-border/70 bg-white p-5 transition hover:-translate-y-1 hover:border-givit-ember/40 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-givit-sand text-2xl">📌</div>
              <h3 className="font-serif text-xl font-bold text-givit-ink">{collection.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{collection.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container py-8 md:py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Discovery feed</p>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Trending gift ideas</h2>
          </div>
          <Link href="/products?sort=popular" className="givit-link text-sm font-medium">See top scores →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tech.map((p) => {
            const s = ratings[p.id];
            const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
            return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} compact />;
          })}
        </div>
      </section>

      <section className="container mt-4">
        <div className="relative overflow-hidden rounded-3xl bg-givit-ember px-8 py-10 text-white md:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/8" />
          <div className="relative max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/65">Built for part two</p>
            <h2 className="mb-2 font-serif text-2xl font-bold md:text-3xl">The AI finder will become the front door.</h2>
            <p className="mb-6 text-sm leading-6 text-white/75">
              This first phase sets up the homepage, free marketplace, product pages, wishlists, rankings, collections, and search structure so the custom gift-giving LLM can recommend against a clean, curated product catalog later.
            </p>
            <Button asChild className="rounded-full bg-white px-6 text-givit-ember hover:bg-white/90">
              <Link href="/gift"><Gift className="h-4 w-4" /> Open Givit AI placeholder</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
