import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useLocation } from "wouter";
import { X, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createNotification, saveGiftOccasion, saveGiftRecipient, saveUserAddress, saveUserPaymentMethod, updateProfile } from "@/lib/supabase/db";
import { SPECIAL_DATES } from "@/lib/data/special-dates";
import { getStripePromise } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/client";

type Step = "welcome" | "address" | "payment" | "recipient" | "done";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASIONS = ["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];
type RecipientDraft = { name: string; relationship: string; occasionLabel: string; occasionDate: string; yearsContext: string };
const emptyRecipient = (): RecipientDraft => ({ name: "", relationship: "", occasionLabel: "Birthday", occasionDate: "", yearsContext: "" });
function scheduledAt10Est(occasionDate: string) { const d = new Date(`${occasionDate}T12:00:00`); d.setDate(d.getDate() - 35); d.setUTCHours(15,0,0,0); return d.toISOString(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }

// Standardized holidays (Christmas, Valentine's Day, etc.) fall on the same
// real calendar date every year — the date field should reflect that
// automatically instead of letting someone pick "Valentine's Day" and then
// set the date to some unrelated day in March.
function standardHoliday(label: string) {
  return SPECIAL_DATES.find((sd) => sd.name === label) ?? null;
}

function nextOccurrenceIso(getDate: (year: number) => Date) {
  const now = new Date();
  const thisYear = getDate(now.getFullYear());
  const target = thisYear >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? thisYear : getDate(now.getFullYear() + 1);
  return target.toISOString().slice(0, 10);
}

// Draft persistence covers step/addresses/recipients so a tab switch, page
// reload, or accidental close doesn't send someone back to "Welcome" after
// they've already filled things in. Never includes card fields — payment
// details stay in memory only and are discarded the moment the component
// unmounts, not written to localStorage.
const DRAFT_KEY = "givit-autogift-onboarding-draft";
type Draft = { step: Step; addresses: typeof INITIAL_ADDRESS[]; recipients: RecipientDraft[] };
const INITIAL_ADDRESS = { label: "", line1: "", city: "", state: "", zip: "", country: "US" };

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

type ConfirmedPaymentMethod = { id: string; brand: string; last4: string };
type PaymentFormHandle = { submit: () => Promise<{ ok: true; method: ConfirmedPaymentMethod } | { ok: false; error: string }> };

// Card fields never touch GIVIT's own state or servers -- Stripe's
// PaymentElement runs inside Stripe's own iframe, and confirmSetup() only
// ever hands this component back an opaque payment_method ID.
const PaymentElementForm = forwardRef<PaymentFormHandle>(function PaymentElementForm(_props, ref) {
  const stripe = useStripe();
  const elements = useElements();

  useImperativeHandle(ref, () => ({
    async submit() {
      if (!stripe || !elements) return { ok: false, error: "Payment form is still loading." };
      const { error: submitError } = await elements.submit();
      if (submitError) return { ok: false, error: submitError.message || "Enter valid card details." };
      const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) return { ok: false, error: error.message || "Card couldn't be saved." };
      const paymentMethodId = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;
      if (!paymentMethodId) return { ok: false, error: "Card couldn't be saved." };
      try {
        const res = await authedFetch(`/api/stripe/setup-intent?paymentMethodId=${encodeURIComponent(paymentMethodId)}`, { method: "GET" });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Card was saved, but details couldn't be confirmed." };
        return { ok: true, method: { id: paymentMethodId, brand: data.brand, last4: data.last4 } };
      } catch (err: any) {
        return { ok: false, error: err.message || "Card was saved, but details couldn't be confirmed." };
      }
    },
  }));

  return <PaymentElement options={{ layout: "tabs" }} />;
});

function readDraft(): Partial<Draft> {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function AutoGiftOnboardingWizard({ onClose, required = false }: { onClose: () => void; required?: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const savedDraft = readDraft();
  const [step, setStep] = useState<Step>(savedDraft.step ?? "welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Address
  const [addresses, setAddresses] = useState(savedDraft.addresses?.length ? savedDraft.addresses : [INITIAL_ADDRESS]);
  // Payment via real Stripe Elements — intentionally not persisted to the
  // draft, see DRAFT_KEY comment above. clientSecret is fetched fresh each
  // time the payment step is reached; confirmedMethod holds the real
  // Stripe-issued payment_method id + brand/last4 once confirmSetup succeeds.
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentFetching, setPaymentFetching] = useState(false);
  const [confirmedMethod, setConfirmedMethod] = useState<ConfirmedPaymentMethod | null>(null);
  const paymentFormRef = useRef<PaymentFormHandle>(null);
  // Recipients
  const [recipients, setRecipients] = useState<RecipientDraft[]>(savedDraft.recipients?.length ? savedDraft.recipients : [emptyRecipient()]);

  useEffect(() => {
    if (step !== "payment" || paymentClientSecret || paymentFetching) return;
    setPaymentFetching(true);
    authedFetch("/api/stripe/setup-intent", { method: "POST" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ error: "Couldn't load payment configuration from server." }));
        if (data.clientSecret) setPaymentClientSecret(data.clientSecret);
        else setError(data.error || "Couldn't load the payment form.");
      })
      .catch((err: any) => setError(err.message || "Couldn't load the payment form."))
      .finally(() => setPaymentFetching(false));
  }, [step]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, addresses, recipients }));
  }, [step, addresses, recipients]);

  async function next() {
    setError("");
    if (step === "welcome") setStep("address");
    else if (step === "address") {
      if (!addresses.some((address) => address.line1 && address.city && address.state && address.zip)) {
        setError("Shipping address is required before AutoGift can continue.");
        return;
      }
      setStep("payment");
    } else if (step === "payment") {
      if (!paymentFormRef.current) {
        setError("Payment form is still loading.");
        return;
      }
      setSaving(true);
      const result = await paymentFormRef.current.submit();
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmedMethod(result.method);
      setStep("recipient");
    } else if (step === "recipient") {
      if (!recipients.some((r) => r.name.trim() && r.occasionDate)) {
        setError("Add at least one recipient with a date so AutoGift knows what to plan for.");
        return;
      }
      setStep("done");
    }
  }

  function back() {
    if (step === "address") setStep("welcome");
    else if (step === "payment") setStep("address");
    else if (step === "recipient") setStep("payment");
  }

  // Address and payment can be filled in later from /account or at order
  // approval time — the only thing AutoGift actually needs up front is a
  // recipient and a date, so those two steps are skippable.
  function skip() {
    setError("");
    if (step === "address") setStep("payment");
    else if (step === "payment") setStep("recipient");
  }

  async function finish() {
    if (!user) {
      // Anonymous "tour" — nothing to persist, just close and nudge to sign up.
      onClose();
      navigate("/signup?next=/concierge");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile(user.id, {
        concierge_onboarding_completed: true,
        gift_automation_enabled: true,
      });
      const validAddresses = addresses.filter((address) => address.line1.trim() && address.city.trim() && address.state.trim() && address.zip.trim());
      for (const [index, address] of validAddresses.entries()) {
        await saveUserAddress({
          user_id: user.id,
          label: address.label.trim() || (index === 0 ? "AutoGift shipping" : `AutoGift shipping ${index + 1}`),
          line1: address.line1.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zip: address.zip.trim(),
          country: address.country || "US",
          is_default: index === 0,
        });
      }
      window.localStorage.setItem("givit-autogift-addresses", JSON.stringify(validAddresses));
      if (confirmedMethod) {
        await saveUserPaymentMethod({
          user_id: user.id,
          stripe_payment_method_id: confirmedMethod.id,
          card_brand: confirmedMethod.brand,
          card_last4: confirmedMethod.last4,
          is_default: true,
        });
      }
      window.localStorage.setItem("givit-autogift-onboarded", "1");
      for (const draft of recipients.filter((r) => r.name.trim() && r.occasionDate)) {
        const { data: recipient } = await saveGiftRecipient({
          user_id: user.id,
          name: draft.name.trim(),
          relationship: draft.relationship || null,
          automation_enabled: true,
          notes: draft.yearsContext ? `${draft.occasionLabel} context: ${draft.yearsContext}` : null,
        });
        if (recipient?.id) {
          const { data: occasion } = await saveGiftOccasion({
            user_id: user.id,
            recipient_id: recipient.id,
            occasion: draft.occasionLabel,
            occasion_date: draft.occasionDate,
            repeats_yearly: true,
            approval_lead_days: 35,
            metadata: { yearsContext: draft.yearsContext, dateWording: occasionDateHelp(draft.occasionLabel) },
          });
          await createNotification({
            user_id: user.id,
            recipient_id: recipient.id,
            occasion_id: occasion?.id ?? null,
            title: `${draft.name.trim()}'s ${draft.occasionLabel} is coming up`,
            body: "AutoGift emails the tailored survey at 10:00 AM EST, 35 days before the date, then asks you to approve the AI-built bundle before charging your saved card.",
            channel: "email",
            scheduled_for: scheduledAt10Est(draft.occasionDate),
            status: "scheduled",
            metadata: { automation: "autogift", source: "onboarding", yearsContext: draft.yearsContext },
          });
        }
      }
      window.localStorage.removeItem(DRAFT_KEY);
      onClose();
      navigate("/concierge");
    } catch (err: any) {
      setError(err.message || "Failed to save setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {/* flex-col + max-h + the body below scrolling on its own (not the
          whole card) is what keeps Back/Continue reachable even when a
          step's content -- adding several recipients, say -- grows taller
          than the viewport. Previously the whole card had no height cap or
          scroll at all, so the footer buttons could render off-screen with
          no way to reach them. */}
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-givit-ember">AutoGift setup</p>
            <h2 className="font-serif text-xl font-bold text-givit-ink">
              {step === "welcome" && "Welcome to AutoGift"}
              {step === "address" && "Where should we ship gifts?"}
              {step === "payment" && "How would you like to pay?"}
              {step === "recipient" && "Who should AutoGift remember?"}
              {step === "done" && "You're all set!"}
            </h2>
          </div>
          {step === "welcome" && (
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Progress */}
          <div className="mb-5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            {["welcome", "address", "payment", "recipient", "done"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${["welcome", "address", "payment", "recipient", "done"].indexOf(step) >= i ? "border-givit-ember bg-givit-ember text-white" : "border-border"}`}>
                  {["welcome", "address", "payment", "recipient", "done"].indexOf(step) > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < 4 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>

          {error && <div className="mb-4 break-all rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          {step === "welcome" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">AutoGift saves the setup details once, then asks for approval before any purchase.</p>
              <ul className="space-y-2 text-sm">
                <li>• Save shipping addresses</li>
                <li>• Keep a payment method on file</li>
                <li>• Add recipients with their key dates</li>
                <li>• Approve all charges before we buy</li>
              </ul>
            </div>
          )}

          {step === "address" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Add one or more shipping addresses. If you add more than one, the survey asks which one to use.</p>
              {addresses.map((address, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-border/40 p-3">
                  <div className="flex items-center justify-between"><p className="text-sm font-semibold text-givit-ink">Address {index + 1}</p>{addresses.length > 1 && <button type="button" onClick={() => setAddresses((prev) => prev.filter((_, i) => i !== index))} className="text-xs text-destructive">Remove</button>}</div>
                  <div className="grid gap-1.5"><label className="text-xs font-semibold text-muted-foreground">Label</label><input value={address.label} onChange={(e) => setAddresses((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} placeholder="Home" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></div>
                  <div className="grid gap-1.5"><label className="text-xs font-semibold text-muted-foreground">Address</label><input value={address.line1} onChange={(e) => setAddresses((prev) => prev.map((item, i) => i === index ? { ...item, line1: e.target.value } : item))} placeholder="123 Main St" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-3"><input value={address.city} onChange={(e) => setAddresses((prev) => prev.map((item, i) => i === index ? { ...item, city: e.target.value } : item))} placeholder="City" className="h-9 rounded-md border border-border bg-background px-3 text-sm" /><input value={address.state} onChange={(e) => setAddresses((prev) => prev.map((item, i) => i === index ? { ...item, state: e.target.value } : item))} placeholder="State" className="h-9 rounded-md border border-border bg-background px-3 text-sm" /></div>
                  <input value={address.zip} onChange={(e) => setAddresses((prev) => prev.map((item, i) => i === index ? { ...item, zip: e.target.value } : item))} placeholder="ZIP" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
              ))}
              <button type="button" onClick={() => setAddresses((prev) => [...prev, { label: "", line1: "", city: "", state: "", zip: "", country: "US" }])} className="w-full rounded-md border border-dashed border-givit-ember/50 py-2 text-sm font-semibold text-givit-ember">+ Add another address</button>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You'll approve each purchase before any charge. Card details are handled directly by Stripe — they never touch GIVIT's own servers.</p>
              {paymentFetching && !paymentClientSecret ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-border/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-givit-ember border-t-transparent" />
                </div>
              ) : paymentClientSecret ? (
                <Elements stripe={getStripePromise()} options={{ clientSecret: paymentClientSecret }}>
                  <PaymentElementForm ref={paymentFormRef} />
                </Elements>
              ) : null}
              <div className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Powered by Stripe. GIVIT only ever stores your card type and last 4 digits, never the full card number. You'll approve every charge before it happens.</span>
              </div>
            </div>
          )}

          {step === "recipient" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add one or more people. Use the date field for the occasion date, then add age, year, or relationship context below only when it helps the AI.</p>
              {recipients.map((r, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-border/40 p-3">
                  <div className="flex items-center justify-between"><p className="text-sm font-semibold text-givit-ink">Recipient {index + 1}</p>{recipients.length > 1 && <button type="button" onClick={() => setRecipients((prev) => prev.filter((_, i) => i !== index))} className="text-xs text-destructive">Remove</button>}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={r.name} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="Full name" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                    <select value={r.relationship} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, relationship: e.target.value } : item))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"><option value="">Relationship...</option>{RELATIONSHIPS.map((rel) => <option key={rel}>{rel}</option>)}</select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={r.occasionLabel}
                      onChange={(e) => {
                        const label = e.target.value;
                        const holiday = standardHoliday(label);
                        setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, occasionLabel: label, occasionDate: holiday ? nextOccurrenceIso(holiday.getDate) : item.occasionDate } : item));
                      }}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                    >
                      {OCCASIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <div className="relative">
                      <input
                        type="date"
                        value={r.occasionDate}
                        // Birthdays/anniversaries need a real past date (AI
                        // calculates age/years from it) -- min=today here
                        // was blocking exactly that, only letting future
                        // dates be picked. Only Birthday gets a cap, and
                        // it's a max (today or earlier), not a min.
                        max={r.occasionLabel === "Birthday" && !standardHoliday(r.occasionLabel) ? todayIso() : undefined}
                        readOnly={Boolean(standardHoliday(r.occasionLabel))}
                        onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, occasionDate: e.target.value } : item))}
                        className={`h-9 w-full rounded-md border border-border bg-background px-3 text-sm ${standardHoliday(r.occasionLabel) ? "cursor-not-allowed text-muted-foreground" : ""}`}
                      />
                      {standardHoliday(r.occasionLabel) && <Lock className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />}
                    </div>
                  </div>
                  {standardHoliday(r.occasionLabel) && (
                    <p className="-mt-1 text-xs text-muted-foreground">{r.occasionLabel} is a fixed date, set automatically each year.</p>
                  )}
                  <input value={r.yearsContext} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, yearsContext: e.target.value } : item))} placeholder={occasionDateHelp(r.occasionLabel)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
              ))}
              <button type="button" onClick={() => setRecipients((prev) => [...prev, emptyRecipient()])} className="w-full rounded-md border border-dashed border-givit-ember/50 py-2 text-sm font-semibold text-givit-ember">+ Add another recipient</button>
            </div>
          )}

                    {step === "done" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="mt-3 font-semibold text-givit-ink">AutoGift is ready</p>
              <p className="text-sm text-muted-foreground">You can add more recipients, edit addresses, and update payment details anytime in AutoGift.</p>
            </div>
          )}
        </div>

        {/* Own row, outside the scrollable area above, so Back/Continue
            are always reachable regardless of how tall the current step's
            content gets. */}
        <div className="flex shrink-0 items-center justify-between border-t border-border p-5">
          <div>
            {step !== "welcome" && step !== "done" && (
              <Button type="button" variant="outline" onClick={back} className="rounded-md">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(step === "address" || step === "payment") && (
              <button type="button" onClick={skip} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
                Skip for now
              </button>
            )}
            {step !== "done" ? (
              <Button onClick={next} disabled={saving || (step === "payment" && !paymentClientSecret)} className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                {saving ? "Saving..." : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                {saving ? "Saving..." : "Go to AutoGift"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function occasionDateHelp(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("birthday")) return "Date of birth: AI calculates age each year";
  if (lower.includes("father")) return "Year they became a father / how many years a father";
  if (lower.includes("mother")) return "Year they became a mother / how many years a mother";
  if (lower.includes("anniversary")) return "Anniversary year and relationship context";
  if (lower.includes("graduation")) return "Graduation year, school, degree, or milestone";
  return "Year/context AutoGift should remember for this special day";
}
