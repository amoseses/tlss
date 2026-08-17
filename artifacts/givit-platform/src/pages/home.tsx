import { Link } from "wouter";
import { ArrowRight, Bell, Gift, Heart, PackageCheck, Sparkles, UserRound, Zap } from "lucide-react";

import { PeopleDashboard } from "@/components/personalization/people-dashboard";
import { RecentMemoryFeed } from "@/components/personalization/recent-memory-feed";
import { RelationshipGraph } from "@/components/personalization/relationship-graph";
import { RelationshipInsights } from "@/components/personalization/relationship-insights";
import { WelcomeTour } from "@/components/personalization/welcome-tour";
import { Button } from "@/components/ui/button";
import { GiftBox3D } from "@/components/ui/gift-box-3d";
import { Reveal } from "@/components/ui/reveal";
import { useAuth } from "@/lib/auth/use-auth";
import { useScrollProgress } from "@/lib/hooks/use-scroll-progress";

const HOW_IT_WORKS_STEPS = [
  { icon: Sparkles, title: "Add someone, once", desc: "Name, interests, budget, dates to avoid — about 30 seconds." },
  { icon: Bell, title: "The agent watches the calendar", desc: "Reminders 5–6 weeks before every important date." },
  { icon: PackageCheck, title: "You approve, GIVIT handles it", desc: "Gift proposed with a reason, then ordered and shipped once you say go." },
];

// Same pinned-scroll technique as the landing page's story section, in the
// app's own light/card palette instead of the marketing page's black --
// scroll position through the section drives which step is active and how
// far the gift box has turned, rather than a static 3-up grid.
function HowItWorksScroll() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const activeStep = Math.min(HOW_IT_WORKS_STEPS.length - 1, Math.floor(progress * HOW_IT_WORKS_STEPS.length));
  const step = HOW_IT_WORKS_STEPS[activeStep]!;
  const Icon = step.icon;
  const rotationY = 8 + progress * 460;

  return (
    <section ref={ref} className="relative border-y border-border/50 bg-givit-sand/40" style={{ height: `${HOW_IT_WORKS_STEPS.length * 110}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="container grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div className="order-2 flex min-h-[180px] flex-col items-center text-center md:order-1 md:items-start md:text-left">
            <div key={activeStep} className="slide-up">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border/40 bg-card shadow-sm md:mx-0">
                <Icon className="h-5 w-5 text-givit-ember" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-givit-ember">
                Step {activeStep + 1} of {HOW_IT_WORKS_STEPS.length}
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-foreground md:text-3xl">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground md:mx-0">{step.desc}</p>
            </div>
          </div>
          <div className="order-1 flex items-center justify-center md:order-2">
            <GiftBox3D size={110} rotation={{ x: 8, y: rotationY }} glow={0.3 + progress * 0.4} />
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
          {HOW_IT_WORKS_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-6 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i === activeStep ? "var(--givit-ember)" : "var(--border)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

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
      <WelcomeTour />
      {/* Hero — minimal, relationship-first, no product wall */}
      <section className="relative overflow-hidden border-b border-border/50 bg-card">
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
            <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-coral">
              <Sparkles className="h-3.5 w-3.5" /> Your AI gifting agent
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Never send a bad gift again.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              GIVIT remembers everyone you care about, reasons about what they'd actually love, and lines it up before you approve it.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="h-12 rounded-full bg-foreground px-6 text-sm font-bold text-background hover:bg-foreground/90">
                <Link href="/people">
                  Add Your First Relationship <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full px-6 text-sm font-semibold">
                <Link href="/gift">
                  <Sparkles className="h-4 w-4" /> Talk to GIVIT
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="container py-6 text-center font-sans text-xl font-bold tracking-tight text-foreground md:text-2xl">
        Never forget an important date again.
      </p>

      {/* How it works — explains the mechanism before showing it in action below */}
      <HowItWorksScroll />

      {/* People dashboard — the actual front door for returning, logged-in users */}
      <PeopleDashboard />

      {/* Visual map of who GIVIT remembers, right after the people it's about */}
      <RelationshipGraph />

      {/* What GIVIT has learned recently — a real, growing memory feed, not a product rail */}
      <RecentMemoryFeed />

      {/* Relationship intelligence — what GIVIT knows and is doing for you, not a product rail */}
      <RelationshipInsights />

      {/* Footer CTA */}
      <Reveal variant="triangle">
        <section className="container mt-4">
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card px-8 py-10 text-foreground md:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-givit-ember/10" />
            <div className="relative max-w-2xl">
              <h2 className="font-serif text-2xl font-bold md:text-3xl">Every AI conversation starts from zero. GIVIT starts with years of context.</h2>
              <p className="mt-3 mb-6 text-sm leading-7 text-muted-foreground">
                {user
                  ? "AutoGift reminds you early and handles fulfillment once you approve."
                  : (
                    <><Link href="/login" className="givit-link underline">Sign in</Link> to let AutoGift remind you early and handle fulfillment once you approve.</>
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
