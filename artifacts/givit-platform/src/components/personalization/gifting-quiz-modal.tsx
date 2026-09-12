import { useEffect, useState } from "react";
import { X, Share2, Check, Feather, PartyPopper, Building2, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUIZ_QUESTIONS, GIFTING_COHORTS, scoreQuiz, getCohort, type GiftingCohort } from "@/lib/data/gifting-cohorts";
import { GiftBox3D } from "@/components/ui/gift-box-3d";

// Same dark "instrument viewport" tile as the home hero's mark and this
// modal's own sorting screen, not a flat emoji-in-a-circle -- ties the
// gift-box/cohort iconography into one consistent material instead of a
// generic quiz-app badge.
export const COHORT_ICONS: Record<GiftingCohort["icon"], typeof Feather> = { Feather, PartyPopper, Building2, Heart };

export function CohortMark({ cohort, size = "md", glow = false }: { cohort: GiftingCohort; size?: "sm" | "md"; glow?: boolean }) {
  const Icon = COHORT_ICONS[cohort.icon];
  const dims = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const iconDims = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className={`relative flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#232228] via-[#18171c] to-[#0a0a0d] shadow-lg shadow-givit-ember/20 ring-1 ring-white/10 ${glow ? "animate-pulse-ring" : ""}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
      <Icon className={`relative ${iconDims} text-givit-ember`} strokeWidth={1.75} />
    </div>
  );
}

type Props = {
  onClose: () => void;
  onComplete: (cohortId: string) => void;
};

// Three-beat ceremony between the last answer and the reveal, timed like a
// real "sorting hat" moment instead of an instant lookup: the box spins
// searching (SPIN_MS), settles and glows brighter like it's warming up to
// open (GLOW_MS), then a bright flash stands in for it actually popping
// open right as it scales away, cross-fading into the badge underneath.
const SPIN_MS = 1100;
const GLOW_MS = 700;
const FLASH_MS = 500;
type SortPhase = "spin" | "glow" | "flash" | null;

export function GiftingQuizModal({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(0); // 0..QUIZ_QUESTIONS.length-1 = questions, length = result
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);
  // Brief "sorting" beat between the last answer and the reveal -- see the
  // 3-phase timeline above.
  const [sortPhase, setSortPhase] = useState<SortPhase>(null);
  const sorting = sortPhase !== null;

  const atResult = step >= QUIZ_QUESTIONS.length && !sorting;
  const resultCohortId = step >= QUIZ_QUESTIONS.length ? scoreQuiz(answers) : null;
  const resultCohort = getCohort(resultCohortId);

  useEffect(() => {
    if (step < QUIZ_QUESTIONS.length) return;
    setSortPhase("spin");
    const toGlow = window.setTimeout(() => setSortPhase("glow"), SPIN_MS);
    const toFlash = window.setTimeout(() => setSortPhase("flash"), SPIN_MS + GLOW_MS);
    const toResult = window.setTimeout(() => setSortPhase(null), SPIN_MS + GLOW_MS + FLASH_MS);
    return () => { window.clearTimeout(toGlow); window.clearTimeout(toFlash); window.clearTimeout(toResult); };
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
      <div className="slide-up w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl">
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
            <div className="h-full rounded-full givit-gradient transition-all duration-500 ease-out" style={{ width: `${(step / QUIZ_QUESTIONS.length) * 100}%` }} />
          </div>
        )}

        {sorting ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div
              className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#232228] via-[#18171c] to-[#0a0a0d] shadow-lg ring-1 ring-white/10 transition-all duration-300 ${
                sortPhase === "flash" ? "scale-125 opacity-0 shadow-givit-ember/50" : "scale-100 opacity-100 shadow-givit-ember/20"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
              {/* Spinning while it's "searching", settled at a fixed angle
                  once it's "warming up to open" -- a continuous spin during
                  the glow/flash beats would fight the box scaling away. */}
              <GiftBox3D size={56} glow={sortPhase === "spin" ? 0.5 : 1} rotation={sortPhase === "spin" ? undefined : { x: 10, y: 25 }} />
              {sortPhase === "flash" && (
                <div className="animate-flash-burst pointer-events-none absolute inset-0 rounded-full bg-white" />
              )}
            </div>
            <p className="mt-5 text-sm font-semibold text-givit-ink">
              {sortPhase === "spin" ? "Finding your gifting style..." : sortPhase === "glow" ? "Almost there..." : "Revealing..."}
            </p>
          </div>
        ) : !atResult ? (
          <div key={step} className="slide-up">
            <h2 className="font-serif text-xl font-bold leading-snug text-givit-ink">{QUIZ_QUESTIONS[step]!.prompt}</h2>
            <div className="stagger-children mt-4 grid gap-2">
              {QUIZ_QUESTIONS[step]!.options.map((opt, i) => (
                <button
                  key={opt.cohortId}
                  type="button"
                  onClick={() => selectAnswer(opt.cohortId)}
                  className="slide-up rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-all duration-150 hover:-translate-y-0.5 hover:border-givit-ember/50 hover:bg-givit-ember/5 hover:shadow-md active:scale-[0.98]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : resultCohort ? (
          <div className="slide-up relative text-center">
            {/* A quiet celebratory flourish around the badge reveal -- kept
                low-opacity and non-interactive so it reads as a sorting-hat
                "ta-da" moment rather than confetti-app decoration. */}
            <Sparkles className="animate-particle pointer-events-none absolute left-6 top-2 h-4 w-4 text-givit-coral/40" style={{ animationDelay: "0.1s" }} />
            <Sparkles className="animate-particle pointer-events-none absolute right-8 top-6 h-3 w-3 text-givit-ember/40" style={{ animationDelay: "0.6s" }} />
            <Sparkles className="animate-particle pointer-events-none absolute bottom-2 left-12 h-3 w-3 text-givit-ember/30" style={{ animationDelay: "1.1s" }} />
            <div className="animate-badge-pop relative mx-auto w-fit">
              <CohortMark cohort={resultCohort} glow />
              {/* The guild's emoji as an actual sticker-badge overlapping the
                  mark's corner -- the lucide icon alone reads as clean but a
                  little clinical; this is the fun, shareable "you got..."
                  flourish a sorting result deserves. */}
              <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card text-lg shadow-md ring-2 ring-background">
                {resultCohort.emoji}
              </span>
            </div>
            <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-givit-ember">{resultCohort.guildName}</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-givit-ink">{resultCohort.name}</h2>
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
            A fun personalization signal, not a scientific test -- {QUIZ_QUESTIONS.length} quick questions.
          </p>
        )}
      </div>
    </div>
  );
}

export { GIFTING_COHORTS };
