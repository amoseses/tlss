import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ClipboardCheck, Gift, Sparkles, Users } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const BETA_GOALS = [
  { icon: Sparkles, title: "Gift AI", body: "Tell us where recommendations feel magical, generic, or missing context." },
  { icon: Gift, title: "Marketplace", body: "React to product discovery, wishlists, gift boards, and purchase handoff clarity." },
  { icon: Users, title: "AutoGift", body: "Help shape surveys, approvals, reminders, and concierge trust signals." },
];

const TESTING_AREAS = ["AI gift finder", "Marketplace browsing", "Gift boards", "AutoGift / concierge", "Account setup", "Seller or product submission"];
const GIFTING_FREQUENCIES = ["Weekly", "Monthly", "A few times a year", "Mostly holidays", "Rarely"];
const TIME_COMMITMENTS = ["15 minutes", "30 minutes", "1 hour", "A few sessions", "Open to follow-up interviews"];

export default function BetaTesterSurveyPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    giftingFrequency: "",
    testingAreas: [] as string[],
    device: "",
    timeCommitment: "",
    firstImpression: "",
    biggestPain: "",
    idealOutcome: "",
    referralSource: "",
    consent: false,
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const completion = useMemo(() => {
    const required = [form.name, form.email, form.giftingFrequency, form.device, form.timeCommitment, form.firstImpression, form.biggestPain, form.idealOutcome];
    const filled = required.filter(Boolean).length + (form.testingAreas.length > 0 ? 1 : 0) + (form.consent ? 1 : 0);
    return Math.round((filled / 10) * 100);
  }, [form]);

  function updateField(field: keyof typeof form, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTestingArea(area: string) {
    setForm((current) => ({
      ...current,
      testingAreas: current.testingAreas.includes(area)
        ? current.testingAreas.filter((item) => item !== area)
        : [...current.testingAreas, area],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const supabase = createClient();
      const message = [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Gifting frequency: ${form.giftingFrequency}`,
        `Testing areas: ${form.testingAreas.join(", ")}`,
        `Primary device: ${form.device}`,
        `Time commitment: ${form.timeCommitment}`,
        `First impression focus: ${form.firstImpression}`,
        `Biggest gifting pain: ${form.biggestPain}`,
        `Ideal beta outcome: ${form.idealOutcome}`,
        `Referral source: ${form.referralSource || "Not provided"}`,
        `Consent to contact: ${form.consent ? "Yes" : "No"}`,
      ].join("\n\n");

      const { error: dbError } = await supabase.from("feedback").insert({
        subject: "Beta tester survey",
        message,
        email: form.email,
        phone: null,
      });

      if (dbError) throw dbError;
      setDone(true);
    } catch {
      setError("Could not submit your beta survey. Please try again or send feedback through Contact Us.");
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
          <p className="mt-3 text-muted-foreground">We will review your answers and reach out when the next beta testing window opens.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-3xl bg-givit-ink p-8 text-white shadow-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-givit-coral">
              <ClipboardCheck className="h-3.5 w-3.5" /> Beta tester survey
            </div>
            <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">Help us make gifting feel effortless.</h1>
            <p className="mt-4 text-sm leading-6 text-white/70 md:text-base">Join the GIVIT beta panel and share what you need from AI recommendations, gift boards, AutoGift reminders, and marketplace discovery before we widen access.</p>
            <div className="mt-6 rounded-2xl bg-white/8 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-white/60">
                <span>Survey progress</span>
                <span>{completion}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-givit-coral transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {BETA_GOALS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-givit-ember/10 text-givit-ember"><Icon className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-semibold text-givit-ink">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="givit-section space-y-6">
          {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" id="name"><input id="name" required value={form.name} onChange={(e) => updateField("name", e.target.value)} className="survey-input" placeholder="Jane Gifter" /></Field>
            <Field label="Email" id="email"><input id="email" required type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="survey-input" placeholder="you@example.com" /></Field>
          </div>

          <Field label="How often do you shop for gifts?" id="giftingFrequency">
            <select id="giftingFrequency" required value={form.giftingFrequency} onChange={(e) => updateField("giftingFrequency", e.target.value)} className="survey-input">
              <option value="">Select one</option>
              {GIFTING_FREQUENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium text-givit-ink">Which areas would you like to test?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TESTING_AREAS.map((area) => (
                <label key={area} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm transition-colors hover:border-givit-ember/60">
                  <input type="checkbox" checked={form.testingAreas.includes(area)} onChange={() => toggleTestingArea(area)} className="h-4 w-4 accent-givit-ember" />
                  {area}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary testing device" id="device"><input id="device" required value={form.device} onChange={(e) => updateField("device", e.target.value)} className="survey-input" placeholder="iPhone, Android, laptop…" /></Field>
            <Field label="Time you can spend" id="timeCommitment">
              <select id="timeCommitment" required value={form.timeCommitment} onChange={(e) => updateField("timeCommitment", e.target.value)} className="survey-input">
                <option value="">Select one</option>
                {TIME_COMMITMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>

          <Field label="What should we learn from your first session?" id="firstImpression"><textarea id="firstImpression" required rows={3} value={form.firstImpression} onChange={(e) => updateField("firstImpression", e.target.value)} className="survey-textarea" placeholder="Example: whether the AI asks enough context before suggesting gifts." /></Field>
          <Field label="What is your biggest pain point when buying gifts?" id="biggestPain"><textarea id="biggestPain" required rows={3} value={form.biggestPain} onChange={(e) => updateField("biggestPain", e.target.value)} className="survey-textarea" /></Field>
          <Field label="What would make this beta valuable for you?" id="idealOutcome"><textarea id="idealOutcome" required rows={3} value={form.idealOutcome} onChange={(e) => updateField("idealOutcome", e.target.value)} className="survey-textarea" /></Field>
          <Field label="How did you hear about the beta? (optional)" id="referralSource"><input id="referralSource" value={form.referralSource} onChange={(e) => updateField("referralSource", e.target.value)} className="survey-input" /></Field>

          <label className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            <input required type="checkbox" checked={form.consent} onChange={(e) => updateField("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-givit-ember" />
            <span>I agree that GIVIT may contact me about beta testing, follow-up interviews, and product updates related to this survey.</span>
          </label>

          <Button type="submit" disabled={sending} className="w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            {sending ? "Submitting…" : "Submit beta survey"}
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
