import { useEffect, useState } from "react";
import { X, Share2, Check, PenLine, Gem, Anchor, Zap, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUIZ_QUESTIONS, GIFTING_COHORTS, scoreQuiz, getCohort, type GiftingCohort } from "@/lib/data/gifting-cohorts";
import { GiftBox3D } from "@/components/ui/gift-box-3d";

// Same dark "instrument viewport" tile as the home hero's mark and this
// modal's own sorting screen, not a flat emoji-in-a-circle -- ties the
// gift-box/cohort iconography into one consistent material instead of a
// generic quiz-app badge.
export const COHORT_ICONS: Record<GiftingCohort["icon"], typeof PenLine> = { PenLine, Gem, Anchor, Zap, Users, Building2 };

export function CohortMark({ cohort, size = "md" }: { cohort: GiftingCohort; size?: "sm" | "md" }) {
  const Icon = COHORT_ICONS[cohort.icon];
  const dims = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className={`relative flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#232228] via-[#18171c] to-[#0a0a0d] shadow-lg shadow-givit-ember/20 ring-1 ring-white/10`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
      <Icon className={`relative ${iconDims} text-givit-ember`} strokeWidth={1.75} />
    </div>
  );
}

type Props = {
  onClose: () => void;
  onComplete: (cohortId: string) => void;
};

const SORTING_MS = 1800;

export function GiftingQuizModal({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(0); // 0..QUIZ_QUESTIONS.length-1 = questions, length = result
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);
  // Brief "sorting" beat between the last answer and the reveal -- the
  // rotating gift box doubles as the ceremony a sorting-hat moment needs;
  // without a pause here the result just appears, which reads as an
  // instant lookup rather than something being figured out.
  const [sorting, setSorting] = useState(false);

  const atResult = step >= QUIZ_QUESTIONS.length && !sorting;
  const resultCohortId = step >= QUIZ_QUESTIONS.length ? scoreQuiz(answers) : null;
  const resultCohort = getCohort(resultCohortId);

  useEffect(() => {
    if (step < QUIZ_QUESTIONS.length) return;
    setSorting(true);
    const timer = window.setTimeout(() => setSorting(false), SORTING_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  function selectAnswer(cohortId: string) {
    const q = QUIZ_QUESTIONS[step]!;
    setAnswers((prev) => ({ ...prev, [q.id]: cohortId }));
    setStep((s) => s + 1);
  }

  async function handleSave() {
    if (!resultCohortId) return;
    setSaving(true);
    try {
      await onComplete(resultCohortId);
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!resultCohort) return;
    const text = `I'm ${resultCohort.name} on GIVIT ${resultCohort.emoji} -- what's your gifting personality?`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/account` : "";
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // user cancelled the share sheet -- not an error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">
            {sorting ? "Sorting..." : atResult ? "Your gifting personality" : `Question ${step + 1} of ${QUIZ_QUESTIONS.length}`}
          </p>
          <button type="button" aria-label="Close quiz" onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-givit-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!atResult && !sorting && (
          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-givit-ember transition-all duration-300" style={{ width: `${(step / QUIZ_QUESTIONS.length) * 100}%` }} />
          </div>
        )}

        {sorting ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#232228] via-[#18171c] to-[#0a0a0d] shadow-lg shadow-givit-ember/20 ring-1 ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
              <GiftBox3D size={56} glow={0.7} />
            </div>
            <p className="mt-5 text-sm font-semibold text-givit-ink">Finding your gifting style...</p>
          </div>
        ) : !atResult ? (
          <div>
            <h2 className="font-serif text-xl font-bold leading-snug text-givit-ink">{QUIZ_QUESTIONS[step]!.prompt}</h2>
            <div className="mt-4 grid gap-2">
              {QUIZ_QUESTIONS[step]!.options.map((opt) => (
                <button
                  key={opt.cohortId}
                  type="button"
                  onClick={() => selectAnswer(opt.cohortId)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-givit-ember/50 hover:bg-givit-ember/5"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : resultCohort ? (
          <div className="text-center">
            <div className="mx-auto"><CohortMark cohort={resultCohort} /></div>
            <h2 className="mt-3 font-serif text-2xl font-bold text-givit-ink">{resultCohort.name}</h2>
            <p className="mt-1 text-sm font-medium italic text-givit-ember">{resultCohort.tagline}</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{resultCohort.description}</p>
            <p className="mt-4 text-xs text-muted-foreground">We'll use this to nudge picks toward what feels like <em>you</em>, not just what your recipient's into -- gifting works both ways.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button onClick={handleSave} disabled={saving} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
                {saving ? "Saving..." : "Save to my profile"}
              </Button>
              <Button type="button" variant="outline" onClick={handleShare} className="rounded-full">
                {shared ? <><Check className="h-4 w-4" /> Copied</> : <><Share2 className="h-4 w-4" /> Share result</>}
              </Button>
            </div>
          </div>
        ) : null}

        {!atResult && !sorting && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            A fun personalization signal, not a scientific test -- 6 quick questions.
          </p>
        )}
      </div>
    </div>
  );
}

export { GIFTING_COHORTS };
