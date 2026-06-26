import { useState } from "react";
import { useLocation } from "wouter";
import { X, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createNotification, saveGiftOccasion, saveGiftRecipient, saveUserAddress, saveUserPaymentMethod, updateProfile } from "@/lib/supabase/db";

type Step = "welcome" | "address" | "payment" | "recipient" | "done";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];

export function AutoGiftOnboardingWizard({ onClose, required = false }: { onClose: () => void; required?: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Address
  const [address, setAddress] = useState({ label: "", line1: "", city: "", state: "", zip: "", country: "US" });
  // Payment (simplified - in production use Stripe Elements)
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  // Recipient
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [occasionLabel, setOccasionLabel] = useState("Birthday");
  const [occasionDate, setOccasionDate] = useState("");

  function next() {
    setError("");
    if (step === "welcome") setStep("address");
    else if (step === "address") {
      if (!address.line1 || !address.city || !address.state || !address.zip) {
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
    } else if (step === "recipient") setStep("done");
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
      if (address.line1.trim()) {
        await saveUserAddress({
          user_id: user.id,
          label: address.label.trim() || "AutoGift shipping",
          line1: address.line1.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zip: address.zip.trim(),
          country: address.country || "US",
          is_default: true,
        });
      }
      await saveUserPaymentMethod({
        user_id: user.id,
        stripe_payment_method_id: `pm_demo_${cardNumber.replace(/\D/g, "").slice(-8)}`,
        card_brand: detectCardBrand(cardNumber),
        card_last4: cardNumber.replace(/\D/g, "").slice(-4),
        is_default: true,
      });
      window.localStorage.setItem("givit-autogift-onboarded", "1");
      if (recipientName.trim()) {
        const { data: recipient } = await saveGiftRecipient({
          user_id: user.id,
          name: recipientName.trim(),
          relationship: relationship || null,
          automation_enabled: true,
        });
        if (recipient?.id && occasionDate) {
          const { data: occasion } = await saveGiftOccasion({
            user_id: user.id,
            recipient_id: recipient.id,
            occasion: occasionLabel,
            occasion_date: occasionDate,
            repeats_yearly: true,
            approval_lead_days: 35,
          });
          const scheduledFor = new Date(new Date(occasionDate).getTime() - 35 * 86400000).toISOString();
          await createNotification({
            user_id: user.id,
            recipient_id: recipient.id,
            occasion_id: occasion?.id ?? null,
            title: `${recipientName.trim()}'s ${occasionLabel} is coming up`,
            body: "AutoGift will email the recipient survey and then ask you to approve AI-selected gifts before charging your saved card.",
            channel: "email",
            scheduled_for: scheduledFor,
            status: "scheduled",
            metadata: { automation: "autogift", source: "onboarding" },
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
              {step === "recipient" && "Who's your first recipient?"}
              {step === "done" && "You're all set!"}
            </h2>
          </div>
          {!required && (
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
              <p className="text-sm text-muted-foreground">AutoGift makes gift-giving effortless. We'll remind you before important dates and help you find the perfect gift.</p>
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
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Label</label>
                <input value={address.label} onChange={(e) => setAddress({ ...address, label: e.target.value })} placeholder="Home" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Address</label>
                <input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="123 Main St" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">City</label>
                  <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">State</label>
                  <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">ZIP</label>
                <input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} placeholder="10001" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
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
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Full name</label>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Mom" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Relationship</label>
                <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
                  <select value={occasionLabel} onChange={(e) => setOccasionLabel(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Date</label>
                  <input type="date" value={occasionDate} onChange={(e) => setOccasionDate(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                </div>
              </div>
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
