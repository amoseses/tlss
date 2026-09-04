import { useState } from "react";
import { Link } from "wouter";
import { Check, ChevronRight, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useRecipients } from "@/lib/hooks/use-recipients";
import { updateProfile } from "@/lib/supabase/db";
import { getCohort } from "@/lib/data/gifting-cohorts";
import { GiftingQuizModal, CohortMark } from "@/components/personalization/gifting-quiz-modal";

const DISMISS_KEY = "givit-profile-completion-dismissed";

// Every checklist item here reflects something real on the profile/account
// -- no fabricated "5 more steps!" filler. Dismissible once completion
// stops mattering to that person, same one-shot localStorage pattern as
// the other post-onboarding nudges (LoginPrompt, WelcomeTour).
export function ProfileCompletionCard() {
  const { user, profile, refresh } = useAuth();
  const { recipients } = useRecipients(user);
  const [showQuiz, setShowQuiz] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  if (!user || dismissed) return null;

  const items = [
    { label: "Add your name", done: Boolean(profile?.full_name?.trim()), href: "/account" },
    { label: "Add a phone number", done: Boolean(profile?.phone?.trim()), href: "/account" },
    { label: "Add a profile photo", done: Boolean(profile?.avatar_url), href: "/account" },
    { label: "Add your first person", done: recipients.length > 0, href: "/people" },
    { label: "Take the gifting personality quiz", done: Boolean(profile?.gifting_cohort), action: () => setShowQuiz(true) },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);
  const cohort = getCohort(profile?.gifting_cohort);

  if (pct === 100) return null;

  async function saveCohort(cohortId: string) {
    if (!user) return;
    await updateProfile(user.id, { gifting_cohort: cohortId });
    refresh();
    setShowQuiz(false);
  }

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable */ }
    setDismissed(true);
  }

  return (
    <>
      <div className="givit-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {cohort ? <CohortMark cohort={cohort} size="sm" /> : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-givit-ember/10">
                <UserIcon className="h-4 w-4 text-givit-ember" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-givit-ink">
                {cohort ? <>Your profile · <span className="text-givit-ember">{cohort.name}</span></> : "Complete your profile"}
              </p>
              <p className="text-xs text-muted-foreground">{pct}% complete</p>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-givit-ember transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => {
            const content = (
              <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/60">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-success text-white" : "border border-border"}`}>
                  {item.done && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                {!item.done && <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            );
            if (item.done) return <div key={item.label}>{content}</div>;
            if (item.action) return <button key={item.label} type="button" onClick={item.action} className="text-left">{content}</button>;
            return <Link key={item.label} href={item.href!}>{content}</Link>;
          })}
        </div>
      </div>
      {showQuiz && <GiftingQuizModal onClose={() => setShowQuiz(false)} onComplete={saveCohort} />}
    </>
  );
}
