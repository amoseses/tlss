import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { updateProfile } from "@/lib/supabase/db";
import { GiftingQuizModal } from "@/components/personalization/gifting-quiz-modal";
import { AutoGiftOnboardingWizard } from "@/components/autogift/autogift-onboarding-wizard";
import { SiteTour, type TourStep } from "@/components/personalization/site-tour";

const KEY = "givit-show-welcome-tour";

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to GIVIT.",
    body: "Let's take a real 60-second look around before you dive in — GIVIT works best once it knows a bit about the people you're shopping for.",
  },
  {
    targetId: "tour-people",
    title: "Your people, saved once.",
    body: "Add someone here — name, interests, dates to avoid — and GIVIT remembers it for every future gift, so you're never starting from scratch.",
  },
  {
    targetId: "tour-graph",
    title: "GIVIT maps how everyone connects.",
    body: "As you add more people, this graph fills in — GIVIT uses it to notice patterns (shared interests, upcoming dates) you'd have to hold in your head otherwise.",
  },
  {
    title: "That's the basics.",
    body: "Add your first person now and GIVIT starts watching their dates right away — or explore on your own, it's all still here whenever you're ready.",
  },
];

// Shown once, right after a real signup completes — the flag is set in
// signup.tsx and consumed (removed) here on the very next page that mounts
// this component, same one-shot pattern as LoginPrompt's own flag.
//
// Previous version forced the 20-question personality quiz immediately,
// then a static "here's how it works" card -- feedback was that forcing a
// quiz on a brand-new account before they've seen anything is exactly the
// kind of friction a YC-minimalist gifting app shouldn't have. Now: a
// genuine interactive tour runs first (scrolls to and spotlights the real
// People section and relationship graph, not a description of them), the
// quiz is offered as a skippable prompt rather than forced, and the
// AutoGift wizard only appears if the tour was actually completed (not
// skipped) -- skipping the tour means "not now" for everything that
// follows it too, not just the tour itself.
type Stage = "quiz-prompt" | "quiz" | "tour" | "wizard" | null;

export function WelcomeTour() {
  const { user, refresh } = useAuth();
  const [stage, setStage] = useState<Stage>(null);

  useEffect(() => {
    if (!user) return;
    if (window.localStorage.getItem(KEY)) {
      window.localStorage.removeItem(KEY);
      setStage("quiz-prompt");
    }
  }, [user]);

  async function saveCohort(cohortId: string) {
    if (user) {
      await updateProfile(user.id, { gifting_cohort: cohortId });
      refresh();
    }
    setStage("tour");
  }

  function finishTour(completed: boolean) {
    setStage(completed ? "wizard" : null);
  }

  if (stage === "quiz-prompt") {
    return (
      <div className="fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-givit-ink">Find your gifting personality?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">A 60-second quiz that helps GIVIT tune its picks to your style. Totally optional.</p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => setStage("quiz")} className="rounded-full bg-givit-ember px-3.5 py-1.5 text-xs font-bold text-white hover:bg-givit-ember-hover">
                Take the quiz
              </button>
              <button type="button" onClick={() => setStage("tour")} className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                Not now
              </button>
            </div>
          </div>
          <button type="button" aria-label="Skip" onClick={() => setStage("tour")} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-givit-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (stage === "quiz") {
    return <GiftingQuizModal onClose={() => setStage("tour")} onComplete={saveCohort} />;
  }

  if (stage === "tour") {
    return <SiteTour steps={TOUR_STEPS} onFinish={finishTour} />;
  }

  if (stage === "wizard") {
    return <AutoGiftOnboardingWizard required={false} onClose={() => setStage(null)} />;
  }

  return null;
}
