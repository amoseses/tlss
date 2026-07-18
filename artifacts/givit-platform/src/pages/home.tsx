import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell, PackageCheck, Sparkles } from "lucide-react";

import { PeopleDashboard } from "@/components/personalization/people-dashboard";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { useAuth } from "@/lib/auth/use-auth";
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
  const { user } = useAuth();
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const trending = MARKETPLACE_PRODUCTS.filter((p) => ["tech", "gaming", "writing", "home"].includes(p.category?.slug ?? "")).slice(0, 4);
  const [homeAiQuery, setHomeAiQuery] = useState("");
  const [, navigate] = useLocation();

  function goToGivitAI(query?: string) {
    const q = (query ?? homeAiQuery).trim();
    navigate(q ? `/gift?q=${encodeURIComponent(q)}` : "/gift");
  }

  return (
    <div className="pb-12">
      {/* Hero — minimal, relationship-first, no product wall */}
      <section className="relative overflow-hidden bg-black">
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-givit-ember/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-givit-coral/20 blur-3xl" />

        <div className="container relative py-16 md:py-24">
          <div className="slide-up mx-auto max-w-xl text-center" style={{ animationDelay: "0ms" }}>
            <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-coral">
              <Sparkles className="h-3.5 w-3.5" /> AI relationship memory
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
              Save someone once. Remember them forever.
            </h1>
            <p className="mt-4 text-base leading-7 text-white/70">
              Add the people in your life and what they love. Givit AI turns that into gift ideas, before you have to think of it yourself.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); goToGivitAI(); }}
              className="mx-auto mt-7 flex max-w-lg overflow-hidden rounded-full bg-white text-givit-ink shadow-xl"
            >
              <input
                value={homeAiQuery}
                onChange={(e) => setHomeAiQuery(e.target.value)}
                placeholder="e.g. my sister who loves hiking and coffee"
                className="min-w-0 flex-1 px-5 py-3.5 text-sm outline-none"
              />
              <Button type="submit" className="m-1.5 rounded-full givit-gradient px-5 text-sm font-bold text-white shadow-md givit-glow">
                <Sparkles className="h-4 w-4" /> Ask
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {HOME_AI_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => goToGivitAI(qp.prompt)}
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/40 hover:bg-white/10"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {!user && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="h-11 rounded-full bg-white px-6 text-sm font-bold text-givit-ink hover:bg-white/90">
                  <Link href="/concierge">
                    Add your first person <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* People dashboard — the actual front door for returning, logged-in users */}
      <PeopleDashboard />

      {/* How it works — 30 seconds once, remembered forever */}
      <Reveal>
        <section className="border-y border-border/50 bg-givit-sand/40">
          <div className="stagger-children container grid gap-6 py-8 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: "Add someone, once", desc: "Name, interests, budget, dates to avoid. About 30 seconds — Givit AI can fill it in from a sentence." },
              { icon: Bell, title: "Get notified early", desc: "Reminders 5–6 weeks before every important date, tied to the person, not a calendar app." },
              { icon: PackageCheck, title: "Approve once, done", desc: "Pick a gift, approve it, and we order, card-write, and ship." },
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

      <section className="container py-4">
        <RecentlyViewedRail />
      </section>

      {/* A handful of ideas, not a storefront — full browsing lives in the marketplace */}
      <Reveal>
        <section className="container py-8 md:py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">A few ideas to start</h2>
            <Link href="/products" className="givit-link text-sm font-medium">Browse the marketplace →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <h2 className="font-serif text-2xl font-bold md:text-3xl">Every AI conversation starts from zero. Givit starts with years of context.</h2>
              <p className="mt-3 mb-6 text-sm leading-7 text-white/65">
                AutoGift reminds you early, handles fulfillment once you approve, and gets to know your people over time. <Link href="/login" className="underline text-white/80 hover:text-white">Sign in</Link> to get started.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-lg bg-givit-ember px-5 text-white transition-transform hover:-translate-y-0.5 hover:bg-givit-ember-hover">
                  <Link href="/concierge"><Bell className="h-4 w-4" /> Add your first person</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-md border-white/20 bg-white/10 text-white transition-transform hover:-translate-y-0.5 hover:bg-white/20">
                  <Link href="/gift"><Sparkles className="h-4 w-4" /> Try Givit AI</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
