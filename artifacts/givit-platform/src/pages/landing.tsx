import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell, Gift, Heart, PartyPopper, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";

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
          <img src="/Screenshot 2026-06-23 095149.png" alt="Givit" className="animate-float relative h-20 w-20 rounded-2xl object-cover shadow-2xl md:h-24 md:w-24" />
        </div>
        <span className="font-serif text-3xl font-bold tracking-tight">
          GIV<span className="text-givit-coral">IT</span>
        </span>
      </div>

      <div className="slide-up relative max-w-2xl" style={{ animationDelay: "80ms" }}>
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-coral">
          <Sparkles className="h-3.5 w-3.5" /> Your AI gifting agent
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold leading-tight md:text-6xl">
          Your AI memory for the people you love.
        </h1>
        <p className="mt-5 min-h-[3.5rem] text-lg text-white/70 md:min-h-[2.5rem]">
          Save someone once. Givit AI remembers{" "}
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
        <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Never forget a date again</span>
      </div>
    </div>
  );
}
