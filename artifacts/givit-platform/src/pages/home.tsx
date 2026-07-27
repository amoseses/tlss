import { Link } from "wouter";
import { ArrowRight, Bell, Gift, Heart, PackageCheck, Sparkles, UserRound, Zap } from "lucide-react";

import { PeopleDashboard } from "@/components/personalization/people-dashboard";
import { RecentMemoryFeed } from "@/components/personalization/recent-memory-feed";
import { RelationshipGraph } from "@/components/personalization/relationship-graph";
import { RelationshipInsights } from "@/components/personalization/relationship-insights";
import { Button } from "@/components/ui/button";
import { GiftBox3D } from "@/components/ui/gift-box-3d";
import { Reveal } from "@/components/ui/reveal";
import { useAuth } from "@/lib/auth/use-auth";

// Same ambient-motion pattern as the landing splash — kept low-opacity and
// pointer-events-none so it reads as atmosphere, not clutter, and never
// intercepts a click.
const FLOATING_ICONS = [
  { Icon: Heart, className: "left-[10%] top-[20%] h-6 w-6 text-givit-coral/25", duration: "8s", delay: "0s" },
  { Icon: UserRound, className: "right-[12%] top-[16%] h-6 w-6 text-givit-ember/25", duration: "7s", delay: "0.5s" },
  { Icon: Sparkles, className: "left-[16%] bottom-[24%] h-5 w-5 text-givit-coral/20", duration: "6.5s", delay: "1s" },
  { Icon: Gift, className: "right-[16%] bottom-[20%] h-6 w-6 text-givit-ember/20", duration: "9s", delay: "0.3s" },
];

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div className="pb-12">
      {/* Hero — minimal, relationship-first, no product wall */}
      <section className="relative overflow-hidden bg-black">
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full bg-givit-ember/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-givit-coral/20 blur-3xl" />
        {FLOATING_ICONS.map(({ Icon, className, duration, delay }, i) => (
          <Icon
            key={i}
            className={`animate-particle pointer-events-none absolute hidden sm:block ${className}`}
            style={{ animationDuration: duration, animationDelay: delay }}
          />
        ))}

        <div className="container relative py-16 md:py-24">
          <div className="slide-up mx-auto max-w-xl text-center" style={{ animationDelay: "0ms" }}>
            <div className="pointer-events-none mx-auto mb-2 flex h-14 items-center justify-center">
              <GiftBox3D size={56} />
            </div>
            <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-coral">
              <Sparkles className="h-3.5 w-3.5" /> Your AI gifting agent
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
              Never send a bad gift again.
            </h1>
            <p className="mt-4 text-base leading-7 text-white/70">
              GIVIT remembers everyone you care about, reasons about what they'd actually love, and lines it up before you approve it.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="h-12 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
                <Link href="/people">
                  Add Your First Relationship <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/25 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/10">
                <Link href="/gift">
                  <Sparkles className="h-4 w-4" /> Talk to GIVIT
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="container py-6 text-center text-xl font-bold tracking-tight text-foreground md:text-2xl">
        One place that remembers who you're shopping for, what they love, and when it matters.
      </p>

      {/* People dashboard — the actual front door for returning, logged-in users */}
      <PeopleDashboard />

      {/* How it works — 30 seconds once, remembered forever */}
      <Reveal variant="triangle">
        <section className="border-y border-border/50 bg-givit-sand/40">
          <div className="stagger-children container grid gap-6 py-8 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: "Add someone, once", desc: "Name, interests, budget, dates to avoid. About 30 seconds: GIVIT AI can fill it in from a sentence." },
              { icon: Bell, title: "The agent watches the calendar", desc: "Reminders 5–6 weeks before every important date, tied to the person, not a generic calendar app." },
              { icon: PackageCheck, title: "You approve, GIVIT handles it", desc: "The agent reasons through your person's profile, proposes gifts with a reason for each, then orders, card-writes, and ships once you say go." },
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

      {/* What GIVIT has learned recently — a real, growing memory feed, not a product rail */}
      <RecentMemoryFeed />

      {/* Relationship intelligence — what GIVIT knows and is doing for you, not a product rail */}
      <RelationshipInsights />

      {/* Visual map of the same memory, for people who'd rather see it than read it */}
      <RelationshipGraph />

      {/* Footer CTA */}
      <Reveal variant="triangle">
        <section className="container mt-4">
          <div className="relative overflow-hidden rounded-xl bg-black px-8 py-10 text-white md:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
            <div className="relative max-w-2xl">
              <h2 className="font-serif text-2xl font-bold md:text-3xl">Every AI conversation starts from zero. GIVIT starts with years of context.</h2>
              <p className="mt-3 mb-6 text-sm leading-7 text-white/65">
                {user
                  ? "AutoGift reminds you early, handles fulfillment once you approve, and gets to know your people over time."
                  : (
                    <>AutoGift reminds you early, handles fulfillment once you approve, and gets to know your people over time. <Link href="/login" className="underline text-white/80 hover:text-white">Sign in</Link> to get started.</>
                  )}
              </p>
              {user ? (
                <Button asChild className="rounded-lg bg-givit-ember px-5 text-white transition-transform hover:-translate-y-0.5 hover:bg-givit-ember-hover">
                  <Link href="/concierge"><Zap className="h-4 w-4" /> Go to AutoGift</Link>
                </Button>
              ) : (
                <Button asChild className="rounded-lg bg-givit-ember px-5 text-white transition-transform hover:-translate-y-0.5 hover:bg-givit-ember-hover">
                  <Link href="/people"><Bell className="h-4 w-4" /> Add your first person</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
