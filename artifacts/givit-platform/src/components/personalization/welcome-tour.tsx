import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { updateProfile } from "@/lib/supabase/db";
import { GiftingQuizModal } from "@/components/personalization/gifting-quiz-modal";
import { AutoGiftOnboardingWizard } from "@/components/autogift/autogift-onboarding-wizard";

const KEY = "givit-show-welcome-tour";

// Shown once, right after a real signup completes — the flag is set in
// signup.tsx and consumed (removed) here on the very next page that mounts
// this component, same one-shot pattern as LoginPrompt's own flag.
//
// Previously: quiz, then a static "here's how it works" card with two
// exit links (add a person / ask the AI) -- informational only, and adding
// a person + setting up AutoGift were two separate things a user had to
// go find on their own later. Now: quiz feeds straight into the real
// AutoGiftOnboardingWizard (the same one /concierge uses), so a brand-new
// account leaves signup having already done the personality quiz, added
// their first person, and set up (or explicitly skipped) AutoGift
// reminders -- one continuous flow instead of three separate discoveries.
type Stage = "quiz" | "wizard" | null;

export function WelcomeTour() {
  const { user, refresh } = useAuth();
  const [stage, setStage] = useState<Stage>(null);

  useEffect(() => {
    if (!user) return;
    if (window.localStorage.getItem(KEY)) {
      window.localStorage.removeItem(KEY);
      setStage("quiz");
    }
  }, [user]);

  async function saveCohort(cohortId: string) {
    if (user) {
      await updateProfile(user.id, { gifting_cohort: cohortId });
      refresh();
    }
    setStage("wizard");
  }

  if (stage === "quiz") {
    // Skippable via its own close button, same as every other onboarding
    // step here -- skipping just means ProfileCompletionCard offers it
    // again later, and moves straight on to the wizard either way.
    return <GiftingQuizModal onClose={() => setStage("wizard")} onComplete={saveCohort} />;
  }

  if (stage === "wizard") {
    return <AutoGiftOnboardingWizard required={false} onClose={() => setStage(null)} />;
  }

  return null;
}
