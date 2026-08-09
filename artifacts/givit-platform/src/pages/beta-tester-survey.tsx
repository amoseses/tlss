import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function BetaTesterSurveyPage() {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const params = new URLSearchParams(window.location.search);
      const betaTesterId = params.get("tester") || params.get("beta_tester") || params.get("ref") || window.localStorage.getItem("givit-beta-tester-id") || "";
      if (betaTesterId) window.localStorage.setItem("givit-beta-tester-id", betaTesterId);

      const message = [
        betaTesterId ? `Beta tester link id: ${betaTesterId}` : "Beta tester link id: Not provided",
        `Email: ${email}`,
        `General notes: ${notes}`,
      ].join("\n\n");

      const supabase = createClient();
      const { error: dbError } = await supabase.from("feedback").insert({
        subject: "Beta testing survey",
        message,
      });

      if (dbError) throw dbError;
      setDone(true);
    } catch {
      setError("Could not submit your beta survey. Please try again or use the feedback widget.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <PageShell narrow>
        <div className="py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-givit-ember">Beta survey received</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-givit-ink">Thank you for helping shape GIVIT.</h1>
          <p className="mt-3 text-muted-foreground">We received your feedback and may follow up at the email you shared.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      <section className="py-10">
        <div className="rounded-3xl bg-black p-8 text-white shadow-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-givit-coral">
            <ClipboardCheck className="h-3.5 w-3.5" /> Beta testing survey
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">Leave quick beta feedback.</h1>
          <p className="mt-4 text-sm leading-6 text-white/70 md:text-base">
            No login needed. Share your email and one general notes box with bugs, confusing moments, missing features, or anything you liked.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="givit-section mt-6 space-y-6">
          {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          <Field label="Email" id="email">
            <input id="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="survey-input" placeholder="you@example.com" />
          </Field>
          <Field label="General notes" id="notes">
            <textarea id="notes" required rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} className="survey-textarea" placeholder="What did you try? What broke? What felt confusing or useful?" />
          </Field>
          <Button type="submit" disabled={sending} className="w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            {sending ? "Submitting…" : "Submit beta feedback"}
          </Button>
        </form>
      </section>
    </PageShell>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-givit-ink" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
