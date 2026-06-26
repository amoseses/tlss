import { useState } from "react";
import { useLocation } from "wouter";
import { X, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createNotification, saveGiftOccasion, saveGiftRecipient, saveUserAddress, saveUserPaymentMethod, updateProfile } from "@/lib/supabase/db";

type Step = "welcome" | "address" | "payment" | "recipient" | "done";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASIONS = ["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];
type RecipientDraft = { name: string; relationship: string; occasionLabel: string; occasionDate: string; yearsContext: string };
const emptyRecipient = (): RecipientDraft => ({ name: "", relationship: "", occasionLabel: "Birthday", occasionDate: "", yearsContext: "" });
function scheduledAt10Est(occasionDate: string) { const d = new Date(`${occasionDate}T12:00:00`); d.setDate(d.getDate() - 35); d.setUTCHours(15,0,0,0); return d.toISOString(); }

export function AutoGiftOnboardingWizard({ onClose, required = false }: { onClose: () => void; required?: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Address
  const [addresses, setAddresses] = useState([{ label: "", line1: "", city: "", state: "", zip: "", country: "US" }]);
  // Payment (simplified - in production use Stripe Elements)
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  // Recipients
  const [recipients, setRecipients] = useState<RecipientDraft[]>([emptyRecipient()]);

  function next() {
    setError("");
    if (step === "welcome") setStep("address");
    else if (step === "address") {
      if (!addresses.some((address) => address.line1 && address.city && address.state && address.zip)) {
        setError("Shipping address is required before AutoGift can continue.");
        return;
      }
      setStep("payment");
    } else if (step === "payment") {
      const digits = cardNumber.replace(/\D/g, "");
      if (!cardName.trim() || digits.length < 13 || !/^\d{2}\/?\d{2}$/.test(cardExpiry.replace(/\s/g, "")) || cardCvc.replace(/\D/g, "").length < 3) {
        setError("Enter the full cardholder name, card number, expiration, and CVC. In production these fields are submitted through Stripe Elements so raw card data never touches Givit servers.");
        return;
      }
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

  async function finish() {
    if (!user) return;
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
      await saveUserPaymentMethod({
        user_id: user.id,
        stripe_payment_method_id: `pm_demo_${cardNumber.replace(/\D/g, "").slice(-8)}`,
        card_brand: detectCardBrand(cardNumber),
        card_last4: cardNumber.replace(/\D/g, "").slice(-4),
        is_default: true,
      });
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
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
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

        <div className="p-5">
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

          {error && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

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
                <div key={index} className="space-y-3 rounded-lg border border-border/60 p-3">
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
              <p className="text-sm text-muted-foreground">You'll approve each purchase before any charge. Collect the full card details now so Stripe can tokenize and save the payment method for AutoGift.</p>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Name on card</label>
                <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jane Customer" autoComplete="cc-name" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Card number</label>
                <input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Expiration</label>
                  <input value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">CVC</label>
                  <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Stripe integration note: use Stripe Elements / SetupIntents in production. This demo only stores brand and last four after validation.</span>
              </div>
            </div>
          )}

          {step === "recipient" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add one or more people. Use the date field for the occasion date, then add age, year, or relationship context below only when it helps the AI.</p>
              {recipients.map((r, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between"><p className="text-sm font-semibold text-givit-ink">Recipient {index + 1}</p>{recipients.length > 1 && <button type="button" onClick={() => setRecipients((prev) => prev.filter((_, i) => i !== index))} className="text-xs text-destructive">Remove</button>}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={r.name} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="Full name" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                    <select value={r.relationship} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, relationship: e.target.value } : item))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"><option value="">Relationship...</option>{RELATIONSHIPS.map((rel) => <option key={rel}>{rel}</option>)}</select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={r.occasionLabel} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, occasionLabel: e.target.value } : item))} className="h-9 rounded-md border border-border bg-background px-3 text-sm">{OCCASIONS.map((item) => <option key={item}>{item}</option>)}</select>
                    <input type="date" value={r.occasionDate} onChange={(e) => setRecipients((prev) => prev.map((item, i) => i === index ? { ...item, occasionDate: e.target.value } : item))} className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
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

          <div className="mt-6 flex items-center justify-between">
            <div>
              {step !== "welcome" && step !== "done" && (
                <Button type="button" variant="outline" onClick={back} className="rounded-md">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step !== "done" ? (
                <Button onClick={next} className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
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
    </div>
  );
}
function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function detectCardBrand(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6/.test(digits)) return "Discover";
  return "Card";
}

function occasionDateHelp(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("birthday")) return "Date of birth — AI calculates age each year";
  if (lower.includes("father")) return "Year they became a father / how many years a father";
  if (lower.includes("mother")) return "Year they became a mother / how many years a mother";
  if (lower.includes("anniversary")) return "Anniversary year and relationship context";
  if (lower.includes("graduation")) return "Graduation year, school, degree, or milestone";
  return "Year/context AutoGift should remember for this special day";
}
