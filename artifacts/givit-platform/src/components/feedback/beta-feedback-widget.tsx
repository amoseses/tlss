import { useEffect, useState } from "react";
import { ArrowDownRight, MessageSquarePlus, X, Send, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/use-auth";

/**
 * Always-available corner widget so testers/devs can drop a quick note
 * without navigating away or signing in — separate from the full
 * /beta-tester-survey intake form.
 */
export function BetaFeedbackWidget() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    const storageKey = "givit-beta-feedback-nudge-dismissed";
    if (window.localStorage.getItem(storageKey) === "true") return;

    const nudgeTimer = window.setTimeout(() => setShowNudge(true), 900);
    return () => window.clearTimeout(nudgeTimer);
  }, []);

  function dismissNudge() {
    setShowNudge(false);
    window.localStorage.setItem("givit-beta-feedback-nudge-dismissed", "true");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const contactEmail = email.trim() || profile?.email;
      const fullMessage = contactEmail ? `Email: ${contactEmail}\n\n${message.trim()}` : message.trim();
      const { error: dbError } = await supabase.from("feedback").insert({
        subject: "Corner widget note",
        message: fullMessage,
      });
      if (dbError) throw dbError;
      setSent(true);
      setMessage("");
    } catch {
      setError("Couldn't send that — try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    setTimeout(() => { setSent(false); setError(""); }, 200);
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
            <p className="text-sm font-semibold text-white">Beta feedback</p>
            <button type="button" onClick={close} aria-label="Close feedback" className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {sent ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium text-givit-ink">Got it — thank you!</p>
              <button type="button" onClick={() => setSent(false)} className="text-xs font-semibold text-givit-ember hover:underline">Leave another note</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
              <p className="text-xs leading-5 text-muted-foreground">Notice something while you're testing? Drop it here — no need to sign in.</p>
              <textarea
                autoFocus
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind — a bug, something confusing, an idea..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional, if you want a reply)"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-givit-ember text-sm font-semibold text-white transition hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send note"}
              </button>
            </form>
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
          <p className="text-sm font-semibold text-givit-ink">Beta testers: quick feedback lives here.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Tap the corner widget anytime to share bugs, confusing moments, or ideas while you browse.
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
