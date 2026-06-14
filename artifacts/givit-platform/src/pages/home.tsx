import { Link } from "wouter";
import { ArrowRight, Bell, Brain, CreditCard, PackageCheck, ShieldCheck, Sparkles, Wand2 } from "lucide-react";

import { GiftCalendar } from "@/components/personalization/gift-calendar";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
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
  const deals = MARKETPLACE_PRODUCTS.filter((p) => p.sale_price_cents && p.gift_match_score >= 88).slice(0, 8);
  const trending = MARKETPLACE_PRODUCTS.filter((p) => ["tech", "gaming", "writing", "home"].includes(p.category?.slug ?? "")).slice(0, 6);

  return (
    <div className="pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-givit-ember via-rose-500 to-amber-400">
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-amber-200/30 blur-3xl" />

        <div className="container relative grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Find the perfect gift in seconds —{" "}
              <span className="italic text-givit-coral">powered by AI.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
              Tell Givit who you're shopping for, the occasion, and your budget. We handle the rest — from curated picks to doorstep delivery.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-lg bg-white px-6 text-sm font-bold text-givit-ember shadow-lg hover:bg-white/95">
                <Link href="/gift">
                  <Sparkles className="h-4 w-4" /> Try Givit AI <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="h-12 rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20">
                <Link href="/concierge">
                  <Bell className="h-4 w-4" /> Set up AutoGift
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-white/80" /> No brand deals</div>
              <div className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-white/80" /> You approve before charge</div>
              <div className="flex items-center gap-1.5"><PackageCheck className="h-4 w-4 text-white/80" /> Handled start to finish</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-lg bg-white p-4 text-givit-ink">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift preview</p>
                  <h2 className="font-serif text-xl font-bold">For Mom's birthday</h2>
                </div>
                <Badge className="bg-givit-ember text-white">96% match</Badge>
              </div>
              <div className="space-y-2.5">
                {MARKETPLACE_PRODUCTS.filter((p) => ["aeropress-clear", "apple-airtags-4-pack", "patagonia-black-hole-duffel"].includes(p.slug)).map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className="flex gap-3 rounded-lg border border-border/70 p-3 transition hover:border-givit-ember/40 hover:shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-givit-sand text-base">🎁</div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.price_range} · {product.gift_match_score}/100 score</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border/50 bg-givit-sand/40">
        <div className="container grid gap-6 py-8 sm:grid-cols-3">
          {[
            { icon: Brain, title: "Tell us who it's for", desc: "Recipient, occasion, budget, and interests. Takes 30 seconds." },
            { icon: Bell, title: "Get notified early", desc: "Reminders 5–6 weeks before every important date." },
            { icon: PackageCheck, title: "Approve once, done", desc: "Pick a gift, approve it — we order, card-write, and ship." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm">
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

      {/* Featured gifts */}
      <section className="container py-10 md:py-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Featured gifts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Curated picks for every occasion and budget.</p>
          </div>
          <Link href="/products" className="givit-link text-sm font-medium">Shop all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => {
            const s = ratings[p.id];
            const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
            return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} featured />;
          })}
        </div>
      </section>

      {/* Gift boards */}
      <section className="container py-4 md:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Gift boards</h2>
            <p className="mt-1 text-sm text-muted-foreground">Themed collections — save ideas, share boards, get inspired.</p>
          </div>
          <Link href="/boards" className="givit-link text-sm font-medium">See all boards →</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {GIFT_COLLECTIONS.slice(0, 4).map((collection) => (
            <Link key={collection.slug} href="/boards" className="rounded-lg border border-border/70 bg-white p-4 transition hover:-translate-y-0.5 hover:border-givit-ember/40 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-givit-sand text-xl">📌</div>
              <h3 className="font-serif text-lg font-bold text-givit-ink">{collection.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{collection.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals */}
      {deals.length > 0 && (
        <section className="container py-8 md:py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Today's deals</h2>
              <p className="mt-1 text-sm text-muted-foreground">Discounted picks with high gift match scores.</p>
            </div>
            <Link href="/products?sort=popular" className="givit-link text-sm font-medium">See all deals →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {deals.map((p) => {
              const s = ratings[p.id];
              const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
              return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} compact />;
            })}
          </div>
        </section>
      )}

      <section className="container py-4">
        <RecentlyViewedRail />
      </section>

      <section className="container py-8 md:py-12">
        <GiftCalendar />
      </section>

      {/* Trending */}
      <section className="container py-8 md:py-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Trending ideas</h2>
          <Link href="/products?sort=popular" className="givit-link text-sm font-medium">See top picks →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {trending.map((p) => {
            const s = ratings[p.id];
            const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
            return <ProductCard key={p.id} product={p} images={p.images} avgRating={avg ?? undefined} reviewCount={s?.review_count ?? 0} compact />;
          })}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="container mt-4">
        <div className="relative overflow-hidden rounded-xl bg-givit-ink px-8 py-10 text-white md:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="relative max-w-2xl">
            <h2 className="font-serif text-2xl font-bold md:text-3xl">Never miss a gift moment again.</h2>
            <p className="mt-3 mb-6 text-sm leading-7 text-white/65">
              AutoGift learns who you buy for, reminds you weeks in advance, and handles everything once you approve.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-lg bg-givit-ember px-5 text-white hover:bg-givit-ember-hover">
                <Link href="/concierge"><Bell className="h-4 w-4" /> Set up AutoGift</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg border-white/20 text-white hover:bg-white/10">
                <Link href="/gift"><Wand2 className="h-4 w-4" /> Try the AI finder</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
