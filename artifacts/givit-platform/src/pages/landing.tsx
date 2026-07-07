import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell, Gift, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";

export const LANDING_ENTERED_KEY = "givit-entered-app";

const ROTATING_PROMPTS = [
  "a mom who loves gardening and cozy nights in",
  "a best friend's milestone birthday",
  "a coworker you don't know that well",
  "a partner's anniversary, no clichés",
  "a dad who says he \"doesn't need anything\"",
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [promptIndex, setPromptIndex] = useState(0);

  // Skip straight to the real app for anyone who's already signed in or has
  // been here before — the splash is meant to be a first impression, not a
  // recurring speed bump.
  useEffect(() => {
    if (loading) return;
    const alreadyEntered = window.localStorage.getItem(LANDING_ENTERED_KEY) === "1";
    if (user || alreadyEntered) navigate("/home", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const id = setInterval(() => setPromptIndex((i) => (i + 1) % ROTATING_PROMPTS.length), 2600);
    return () => clearInterval(id);
  }, []);

  function enterAsGuest() {
    window.localStorage.setItem(LANDING_ENTERED_KEY, "1");
    navigate("/home");
  }

  if (loading || user) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 py-16 text-center text-white">
      <div className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] animate-drift rounded-full bg-givit-ember/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[420px] animate-drift-slow rounded-full bg-givit-coral/20 blur-3xl" />

      <div className="slide-up mb-10 flex items-center gap-2" style={{ animationDelay: "0ms" }}>
        <img src="/Screenshot 2026-06-23 095149.png" alt="Givit" className="h-10 w-10 rounded-lg object-cover" />
        <span className="font-serif text-2xl font-bold tracking-tight">
          GIV<span className="text-givit-coral">IT</span>
        </span>
      </div>

      <div className="slide-up relative max-w-2xl" style={{ animationDelay: "80ms" }}>
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-givit-coral">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered gifting
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold leading-tight md:text-6xl">
          Never send a generic gift again.
        </h1>
        <p className="mt-5 min-h-[3.5rem] text-lg text-white/70 md:min-h-[2.5rem]">
          Find something great for{" "}
          <span key={promptIndex} className="slide-up inline-block font-semibold text-white">
            {ROTATING_PROMPTS[promptIndex]}
          </span>
        </p>
      </div>

      <div className="slide-up mt-6 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "160ms" }}>
        <Button asChild className="h-12 rounded-md givit-gradient px-7 text-sm font-bold text-white shadow-lg givit-glow transition-transform hover:-translate-y-0.5 hover:brightness-110">
          <Link href="/signup?next=/home">
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-md border-white/25 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10">
          <Link href="/login?next=/home">Log in</Link>
        </Button>
      </div>

      <button
        type="button"
        onClick={enterAsGuest}
        className="slide-up mt-6 text-sm font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
        style={{ animationDelay: "220ms" }}
      >
        Continue browsing without an account →
      </button>

      <div className="slide-up mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40" style={{ animationDelay: "260ms" }}>
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> No brand deals in rankings</span>
        <span className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Real gifts, real reasons</span>
        <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Never forget a date again</span>
      </div>
    </div>
  );
}
