import { useEffect, useState } from "react";
import { ArrowDownRight, MessageSquarePlus, X, Send, CheckCircle2, Heart, Bug, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/use-auth";

const REACTIONS = [
  { key: "love", label: "Love it", icon: Heart, message: "Loving it so far!" },
  { key: "bug", label: "Found a bug", icon: Bug, message: "" },
  { key: "idea", label: "Have an idea", icon: Lightbulb, message: "" },
] as const;

/**
 * Always-available corner widget so testers/devs can drop a quick note
 * without navigating away or signing in — separate from the full
 * /beta-tester-survey intake form. Leads with one-tap reaction buttons
 * (send instantly, no typing required) since a required textarea was the
 * main friction stopping people from actually leaving feedback; typing
 * more detail is still there as an optional next step, not the default.
 */
export function BetaFeedbackWidget({ betaMode = false }: { betaMode?: boolean }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reaction, setReaction] = useState<(typeof REACTIONS)[number] | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [betaTesterId, setBetaTesterId] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showNudge, setShowNudge] = useState(false);
  const [addingDetail, setAddingDetail] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tester = params.get("tester") || params.get("beta_tester") || params.get("ref") || window.localStorage.getItem("givit-beta-tester-id") || "";
    if (tester) {
      window.localStorage.setItem("givit-beta-tester-id", tester);
      setBetaTesterId(tester);
    }

    if (betaMode) {
      setOpen(true);
      setShowNudge(true);
      return;
    }

    const storageKey = "givit-beta-feedback-nudge-dismissed";
    if (window.localStorage.getItem(storageKey) === "true") return;

    const nudgeTimer = window.setTimeout(() => setShowNudge(true), 900);
    return () => window.clearTimeout(nudgeTimer);
  }, [betaMode]);

  function dismissNudge() {
    setShowNudge(false);
    window.localStorage.setItem("givit-beta-feedback-nudge-dismissed", "true");
  }

  async function submitFeedback(subject: string, body: string) {
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const contactEmail = email.trim() || profile?.email || "";
      const tracking = betaTesterId ? `Beta tester link id: ${betaTesterId}\n` : "";
      const fullMessage = `${tracking}${contactEmail ? `Email: ${contactEmail}\n\n` : ""}${body}`;
      const { error: dbError } = await supabase.from("feedback").insert({ subject, message: fullMessage || subject });
      if (dbError) throw dbError;
      setSent(true);
      setMessage("");
    } catch {
      setError("Couldn't send that, try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  // One tap, no typing required — this is the default path. "Found a bug"
  // and "Have an idea" open the detail box since those are rarely useful
  // without a sentence of context; "Love it" sends immediately since the
  // reaction alone is already the whole signal.
  function tapReaction(r: (typeof REACTIONS)[number]) {
    setReaction(r);
    if (r.key === "love") {
      void submitFeedback(r.label, r.message);
    } else {
      setAddingDetail(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await submitFeedback(betaMode ? "Beta testing survey" : reaction?.label ?? "Corner widget note", message.trim());
  }

  function close() {
    setOpen(false);
    setTimeout(() => { setSent(false); setError(""); setReaction(null); setAddingDetail(false); setMessage(""); }, 200);
  }

  function openFeedback() {
    dismissNudge();
    setOpen(true);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="slide-up w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/60 bg-black px-4 py-3">
            <p className="text-sm font-semibold text-white">{betaMode ? "Beta testing survey" : "Beta feedback"}</p>
            <button type="button" onClick={close} aria-label="Close feedback" className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {sent ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium text-givit-ink">Got it, thank you!</p>
              <button
                type="button"
                onClick={() => { setSent(false); setReaction(null); setAddingDetail(false); setMessage(""); }}
                className="text-xs font-semibold text-givit-ember hover:underline"
              >
                Leave another note
              </button>
            </div>
          ) : (
            <div className="p-4">
              <p className="mb-3 text-xs leading-5 text-muted-foreground">{betaMode ? "Free access — no login needed. Share your email and one general note so we can track beta feedback." : "One tap, no need to sign in."}</p>
              {betaMode ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email for follow-up"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    autoFocus
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="General notes, bugs, confusing spots, or ideas…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  {betaTesterId && <p className="text-[11px] text-muted-foreground">Tracking beta tester: {betaTesterId}</p>}
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-givit-ember text-xs font-semibold text-white transition hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send beta feedback"}
                  </button>
                </form>
              ) : (
              <>
              <div className="grid grid-cols-3 gap-2">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    disabled={sending}
                    onClick={() => tapReaction(r)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition disabled:opacity-50 ${
                      reaction?.key === r.key ? "border-givit-ember bg-givit-ember/10 text-givit-ember" : "border-border bg-background text-foreground hover:border-givit-ember/40 hover:bg-givit-sand"
                    }`}
                  >
                    <r.icon className="h-5 w-5" />
                    {r.label}
                  </button>
                ))}
              </div>

              {addingDetail && (
                <form onSubmit={handleSubmit} className="slide-up mt-3 space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={reaction?.key === "bug" ? "What happened, and where?" : "What's the idea?"}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-givit-ember text-xs font-semibold text-white transition hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
                  </button>
                </form>
              )}

              {!addingDetail && (
                <button
                  type="button"
                  onClick={() => setAddingDetail(true)}
                  className="mt-3 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-givit-ember hover:underline"
                >
                  + Add a note instead
                </button>
              )}
              </>
              )}
            </div>
          )}
        </div>
      )}

      {showNudge && !open && (
        <div className="slide-up relative mr-1 max-w-[18rem] rounded-2xl border border-givit-ember/25 bg-card p-4 pr-10 text-left shadow-2xl shadow-black/20">
          <button
            type="button"
            onClick={dismissNudge}
            aria-label="Dismiss beta feedback tip"
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-sm font-semibold text-givit-ink">Beta testing survey — leave feedback here.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {betaMode ? "This beta link is tracked for tester feedback. No login is needed to browse and try features." : "Tap the corner widget anytime to share bugs, confusing moments, or ideas while you browse."}
          </p>
          <button
            type="button"
            onClick={openFeedback}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-givit-ember px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-givit-ember-hover"
          >
            Leave feedback
            <ArrowDownRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute -bottom-2 right-5 h-4 w-4 rotate-45 border-b border-r border-givit-ember/25 bg-card" aria-hidden="true" />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (!open) dismissNudge();
          setOpen((v) => !v);
        }}
        aria-label="Leave beta feedback"
        className="flex h-12 w-12 items-center justify-center rounded-full givit-gradient text-white shadow-lg givit-glow transition hover:brightness-110"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
      </button>
    </div>
  );
}
