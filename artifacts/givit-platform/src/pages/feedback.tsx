import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: dbError } = await supabase.from("feedback").insert({ subject, message, email: email || null, phone: phone || null });
      if (dbError) throw dbError;
      setDone(true);
    } catch {
      setError("Could not send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <PageShell narrow>
        <div className="py-16 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-givit-ember/10 text-3xl">✅</div>
          <h1 className="font-serif text-2xl font-bold text-givit-ink">Thank you!</h1>
          <p className="mt-2 text-muted-foreground">Your feedback has been received.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-givit-ink">Contact & Feedback</h1>
        <p className="mt-2 text-muted-foreground text-sm">Have ideas, bugs, or suggestions? We read everything. Or call us at <a href="tel:2673785600" className="text-givit-ember font-semibold hover:underline">267-378-5600</a>.</p>
      </div>
      <form onSubmit={handleSubmit} className="givit-section space-y-4">
        {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email (optional)</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="267-378-5600" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="subject">Subject</label>
          <input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="message">Message</label>
          <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button type="submit" disabled={sending} className="w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
          {sending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
    </PageShell>
  );
}