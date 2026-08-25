import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell, ChevronDown, Gift, Heart, PackageCheck, PartyPopper, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { GiftBox3D } from "@/components/ui/gift-box-3d";
import { useScrollProgress } from "@/lib/hooks/use-scroll-progress";
import { getMarketplaceProductBySlug } from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/format";

const ROTATING_PROMPTS = [
  "a mom who loves gardening and cozy nights in",
  "a best friend's milestone birthday",
  "a coworker you don't know that well",
  "a partner's anniversary, no clichés",
  "a dad who says he \"doesn't need anything\"",
];

// Ambient floating icons scattered around the splash — purely decorative
// movement, kept low-opacity and pointer-events-none so they never compete
// with the actual content or intercept clicks.
const FLOATING_ICONS = [
  { Icon: Gift, className: "left-[8%] top-[18%] h-7 w-7 text-givit-ember/25", duration: "7s", delay: "0s" },
  { Icon: Sparkles, className: "right-[12%] top-[14%] h-6 w-6 text-givit-coral/30", duration: "8.5s", delay: "0.6s" },
  { Icon: Star, className: "left-[15%] bottom-[22%] h-5 w-5 text-givit-coral/25", duration: "6.5s", delay: "1.2s" },
  { Icon: Heart, className: "right-[18%] bottom-[28%] h-6 w-6 text-givit-ember/20", duration: "9s", delay: "0.3s" },
  { Icon: PartyPopper, className: "left-[6%] top-[55%] h-6 w-6 text-givit-ember/20", duration: "7.5s", delay: "1.6s" },
  { Icon: Sparkles, className: "right-[7%] top-[50%] h-5 w-5 text-givit-coral/20", duration: "6.8s", delay: "0.9s" },
];

// Trimmed from 4 steps to 3 (and from 120vh to 90vh each, ~460vh down to
// ~270vh of scroll) after feedback that the story took too long to get
// through before even reaching an account -- same mechanic, shorter trip.
const STORY_STEPS = [
  {
    Icon: UserRound,
    title: "Save someone once",
    body: "Names, dates, interests — the details you'd normally hold in your head, or forget.",
  },
  {
    Icon: Sparkles,
    title: "Your Gift AI remembers",
    body: "It proposes a real bundle before every date, with a stated reason for each pick — not a guess.",
  },
  {
    Icon: PackageCheck,
    title: "You approve, it ships",
    body: "Nothing charges or ships without your yes. The agent thinks it through; you keep the final say.",
  },
];

// A pinned scroll narrative: the section is several viewport-heights tall,
// the inner content stays sticky at the top of the viewport the whole
// time, and scroll position (not a timer) drives which step is showing
// and how far the gift box has turned -- the section itself never moves,
// scrolling through it just advances the story, the same technique behind
// the "things morph as you scroll" feeling on sites like Convexia.
function StoryScroll() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const activeStep = Math.min(STORY_STEPS.length - 1, Math.floor(progress * STORY_STEPS.length));
  const step = STORY_STEPS[activeStep]!;
  const Icon = step.Icon;
  // Just over one full turn across the whole (now shorter) section -- enough
  // motion to read as continuous without needing as much scroll distance.
  const rotationY = 8 + progress * 380;

  return (
    <section ref={ref} className="relative bg-black" style={{ height: `${STORY_STEPS.length * 90}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-givit-ember/10 blur-3xl" />
        <div className="container relative grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="order-2 flex min-h-[220px] flex-col justify-center text-center md:order-1 md:text-left">
            <div key={activeStep} className="slide-up mx-auto md:mx-0">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl givit-gradient md:mx-0">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-givit-coral">
                Step {activeStep + 1} of {STORY_STEPS.length}
              </p>
              <h3 className="mt-1 font-serif text-3xl font-bold text-white md:text-4xl">{step.title}</h3>
              <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/60 md:mx-0">{step.body}</p>
            </div>
          </div>
          <div className="order-1 flex items-center justify-center md:order-2">
            <GiftBox3D size={150} rotation={{ x: 8, y: rotationY }} glow={0.5 + progress * 0.5} />
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2">
          {STORY_STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-6 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i === activeStep ? "var(--givit-ember)" : "rgba(255,255,255,0.15)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// A handful of real, in-stock catalog items with real retailer photos --
// the marketing page was previously 100% text/icons/animation with zero
// product proof, which read as "all AI talk, no actual gifts." This is
// deliberately small (4 cards, one row) rather than a full marketplace
// wall: just enough to prove the catalog is real before asking for an
// account, not a second product-browsing surface.
const SHOWCASE_SLUGS = ["sony-wh-1000xm5", "yeti-rambler-bottle", "manduka-pro-yoga-mat", "jacques-torres-chocolate"];

function ProductShowcase() {
  const products = SHOWCASE_SLUGS.map((slug) => getMarketplaceProductBySlug(slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (products.length === 0) return null;

  return (
    <section className="relative bg-black px-6 py-20 text-center text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-givit-coral">Real gifts, not just AI talk</p>
      <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Pulled from a catalog of real, in-stock products.</h2>
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product) => {
          const image = product.images[0]?.storage_path;
          const price = product.sale_price_cents ?? product.price_cents;
          return (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:-translate-y-1 hover:border-white/25"
            >
              <div className="aspect-square overflow-hidden bg-white">
                <img
                  src={image}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-semibold text-white">{product.name}</p>
                <p className="mt-1 text-sm font-bold text-givit-coral">{formatMoney(price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Classic startup-site typewriter: types a phrase out, holds it, deletes it,
// then moves to the next. Driven by (text, deleting, phraseIndex) rather than
// a fixed-interval swap so the reveal itself reads as motion, not a slide.
function useTypingCycle(phrases: string[], typeMs = 34, deleteMs = 18, pauseMs = 1600) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIndex];

    if (!deleting && text === phrase) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
      return;
    }
    const t = setTimeout(() => {
      setText(deleting ? phrase.slice(0, text.length - 1) : phrase.slice(0, text.length + 1));
    }, deleting ? deleteMs : typeMs);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIndex, phrases, typeMs, deleteMs, pauseMs]);

  return text;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const typedPrompt = useTypingCycle(ROTATING_PROMPTS);

  function enterAsGuest() {
    navigate("/home");
  }

  if (loading) return null;

  return (
    <div className="bg-black">
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 py-16 text-center text-white">
      <div className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] animate-drift rounded-full bg-givit-ember/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[420px] animate-drift-slow rounded-full bg-givit-coral/20 blur-3xl" />

      {FLOATING_ICONS.map(({ Icon, className, duration, delay }, i) => (
        <Icon
          key={i}
          className={`animate-particle pointer-events-none absolute hidden sm:block ${className}`}
          style={{ animationDuration: duration, animationDelay: delay }}
        />
      ))}

      <div className="slide-up mb-10 flex flex-col items-center gap-3" style={{ animationDelay: "0ms" }}>
        <div className="relative">
          <div className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-2xl bg-givit-ember/40 blur-xl" />
          <img src="/Screenshot 2026-06-23 095149.png" alt="GIVIT" className="animate-float relative h-20 w-20 rounded-2xl object-cover shadow-2xl md:h-24 md:w-24" />
        </div>
        <span className="font-serif text-3xl font-bold tracking-tight">
          GIVIT
        </span>
      </div>

      <div className="slide-up relative max-w-2xl" style={{ animationDelay: "80ms" }}>
        <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
          A memory for the people you love.
        </h1>
        <p className="mt-5 min-h-[3.5rem] text-lg text-white/70 md:min-h-[2.5rem]">
          Save someone once. Your Gift AI remembers{" "}
          <span className="inline-block font-semibold text-white">
            {typedPrompt}
            <span className="animate-cursor-blink ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-white/80 align-middle" />
          </span>
        </p>
      </div>

      <div className="slide-up mt-6 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "160ms" }}>
        {user ? (
          <>
            <Button asChild className="h-12 rounded-md givit-gradient px-7 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
              <Link href="/home">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-md border-white/25 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10">
              <Link href="/people">Your people</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild className="h-12 rounded-md givit-gradient px-7 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
              <Link href="/signup?next=/home">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-md border-white/25 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10">
              <Link href="/login?next=/home">Log in</Link>
            </Button>
          </>
        )}
      </div>

      {!user && (
        <button
          type="button"
          onClick={enterAsGuest}
          className="slide-up mt-6 text-sm font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
          style={{ animationDelay: "220ms" }}
        >
          Continue browsing without an account →
        </button>
      )}

      <div className="slide-up mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40" style={{ animationDelay: "260ms" }}>
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> No brand deals in rankings</span>
        <span className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Real gifts, real reasons</span>
        <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Never forget an important date again</span>
      </div>

      {/* The hero is a full viewport tall, so the story section right
          below it is otherwise invisible until someone happens to scroll --
          this makes it explicit there's more, rather than the page reading
          as if it ends here. */}
      <div className="slide-up animate-float absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/40" style={{ animationDelay: "320ms" }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest">See how it works</span>
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>

    <StoryScroll />

    <ProductShowcase />

    <div className="relative flex flex-col items-center gap-5 bg-black px-6 py-24 text-center text-white">
      <h2 className="font-serif text-3xl font-bold md:text-4xl">Ready to never send a bad gift again?</h2>
      {user ? (
        <Button asChild className="h-12 rounded-md givit-gradient px-7 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
          <Link href="/home">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      ) : (
        <Button asChild className="h-12 rounded-md givit-gradient px-7 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
          <Link href="/signup?next=/home">Create free account <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      )}
    </div>
    </div>
  );
}
