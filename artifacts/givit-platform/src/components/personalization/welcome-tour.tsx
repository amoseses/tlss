import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, PackageCheck, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";

const KEY = "givit-show-welcome-tour";

const STEPS = [
  { Icon: UserRound, text: "Add someone: name, interests, budget, dates to avoid." },
  { Icon: Bell, text: "GIVIT reminds you 5–6 weeks before every date." },
  { Icon: PackageCheck, text: "You approve the pick before anything ships." },
];

// Shown once, right after a real signup completes — the flag is set in
// signup.tsx and consumed (removed) here on the very next page that mounts
// this component, same one-shot pattern as LoginPrompt's own flag. Kept to
// a single short card instead of a multi-screen wizard: a reviewer flagged
// there was no onboarding at all after signup, but the ask was to simplify
// the pre-account experience, not replace it with a longer one.
export function WelcomeTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (window.localStorage.getItem(KEY)) {
      window.localStorage.removeItem(KEY);
      setOpen(true);
    }
  }, [user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Welcome to GIVIT</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-givit-ink">Here's how it works.</h2>
          </div>
          <button
            type="button"
            aria-label="Close welcome tour"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-givit-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="mt-5 space-y-4">
          {STEPS.map(({ Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-givit-ember/10 text-givit-ember">
                <Icon className="h-4 w-4" />
              </div>
              <p className="pt-1 text-sm leading-snug text-foreground">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={() => setOpen(false)}>
            <Link href="/people">Add your first person</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-full" onClick={() => setOpen(false)}>
            <Link href="/gift">Or just ask Your Gift AI</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
