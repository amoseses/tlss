import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell, Brain, CreditCard, PackageCheck, ShieldCheck, Sparkles, Wand2 } from "lucide-react";

import { GiftCalendar } from "@/components/personalization/gift-calendar";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import {
  MARKETPLACE_PRODUCTS,
  MARKETPLACE_RATINGS,
} from "@/lib/data/marketplace";

const HOME_AI_PROMPTS = [
  { label: "For Mom 🌸", prompt: "Gift for my mom, birthday, $50 budget, loves cooking and gardening" },
  { label: "For Dad 🔧", prompt: "Gift for my dad, under $75, likes tools, coffee, and the outdoors" },
  { label: "For a friend 🎉", prompt: "Gift for a close friend, just because, $30-$50, likes cozy nights in" },
];

export default function HomePage() {
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const featured = MARKETPLACE_PRODUCTS.slice(0, 4);
  const deals = MARKETPLACE_PRODUCTS.filter((p) => p.sale_price_cents && p.gift_match_score >= 75).slice(0, 8);
  const trending = MARKETPLACE_PRODUCTS.filter((p) => ["tech", "gaming", "writing", "home"].includes(p.category?.slug ?? "")).slice(0, 6);
  const [homeAiQuery, setHomeAiQuery] = useState("");
  const [, navigate] = useLocation();

  function goToGivitAI(query?: string) {
    const q = (query ?? homeAiQuery).trim();
    navigate(q ? `/gift?q=${encodeURIComponent(q)}` : "/gift");
  }

  return (
    <div className="pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-givit-ember/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-givit-coral/20 blur-3xl" />

        <div className="container relative py-14 md:py-20 lg:py-24">
          <div className="slide-up mx-auto max-w-2xl text-center" style={{ animationDelay: "0ms" }}>
            <h1 className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Find the perfect gift in seconds —{" "}
              <span className="italic text-givit-coral">powered by AI.</span>
            </h1>

            <p className="mt-5 text-base leading-7 text-white/75">
              Tell Givit who you're shopping for, the occasion, and your budget. We handle the rest — from curated picks to doorstep delivery.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild className="h-12 rounded-md givit-gradient px-6 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
                <Link href="/gift">
                  <Sparkles className="h-4 w-4" /> Try Givit AI <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="h-12 rounded-md border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:bg-white/20">
                <Link href="/concierge">
                  <Bell className="h-4 w-4" /> Set up AutoGift
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-white/80" /> No brand deals</div>
              <div className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-white/80" /> You approve before charge</div>
              <div className="flex items-center gap-1.5"><PackageCheck className="h-4 w-4 text-white/80" /> Handled start to finish</div>
            </div>
          </div>
        </div>
      </section>

      {/* Givit AI teaser */}
      <Reveal>
        <section className="container py-10 md:py-14">
          <div className="givit-panel relative overflow-hidden p-6 md:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-givit-ember/10 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-lg">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-givit-ember/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-ember">
                  <Sparkles className="h-3.5 w-3.5" /> Givit AI
                </p>
                <h2 className="mt-3 font-serif text-2xl font-bold text-foreground md:text-3xl">Describe the person, not the product.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Givit AI reads what actually matters — their interests, quirks, and any notes you give it — and picks real gifts with a specific reason for each one.
                </p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); goToGivitAI(); }} className="flex w-full flex-col gap-3 lg:w-[380px]">
                <div className="flex gap-2">
                  <input
                    value={homeAiQuery}
                    onChange={(e) => setHomeAiQuery(e.target.value)}
                    placeholder="e.g. my sister who loves hiking and coffee"
                    className="h-11 w-full rounded-md border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                  />
                  <Button type="submit" className="h-11 shrink-0 rounded-md givit-gradient px-4 text-sm font-bold text-white shadow-md givit-glow">
                    <Sparkles className="h-4 w-4" /> Ask
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOME_AI_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => goToGivitAI(qp.prompt)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-givit-ember/40 hover:text-givit-ember"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </section>
      </Reveal>

      {/* How it works */}
      <Reveal>
        <section className="border-b border-border/50 bg-givit-sand/40">
          <div className="stagger-children container grid gap-6 py-8 sm:grid-cols-3">
            {[
              { icon: Brain, title: "Tell us who it's for", desc: "Recipient, occasion, budget, and interests. Takes 30 seconds." },
              { icon: Bell, title: "Get notified early", desc: "Reminders 5–6 weeks before every important date." },
              { icon: PackageCheck, title: "Approve once, done", desc: "Pick a gift, approve it — we order, card-write, and ship." },
            ].map((item) => (
              <div key={item.title} className="slide-up flex gap-4 opacity-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card shadow-sm transition-transform hover:scale-110">
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
      </Reveal>

      {/* Featured gifts */}
      <Reveal>
        <section className="container py-10 md:py-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Featured gifts</h2>
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
      </Reveal>

      {/* Deals */}
      {deals.length > 0 && (
        <Reveal>
          <section className="container py-8 md:py-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
              <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Today's deals</h2>
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
        </Reveal>
      )}

      <section className="container py-4">
        <RecentlyViewedRail />
      </section>

      <Reveal>
        <section className="container py-8 md:py-12">
          <GiftCalendar />
        </section>
      </Reveal>

      {/* Trending */}
      <Reveal>
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
      </Reveal>

      {/* Footer CTA */}
      <Reveal>
        <section className="container mt-4">
          <div className="relative overflow-hidden rounded-xl bg-black px-8 py-10 text-white md:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
            <div className="relative max-w-2xl">
            <h2 className="font-serif text-2xl font-bold md:text-3xl">Automating your gift giving so you never forget.</h2>
              <p className="mt-3 mb-6 text-sm leading-7 text-white/65">
                AutoGift reminds you early, handles fulfillment once you approve, and learns your style over time. <Link href="/login" className="underline text-white/80 hover:text-white">Sign in</Link> to get started.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-lg bg-givit-ember px-5 text-white transition-transform hover:-translate-y-0.5 hover:bg-givit-ember-hover">
                  <Link href="/concierge"><Bell className="h-4 w-4" /> Set up AutoGift</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-md border-white/20 bg-white/10 text-white transition-transform hover:-translate-y-0.5 hover:bg-white/20">
                  <Link href="/gift"><Wand2 className="h-4 w-4" /> Try Givit AI</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
