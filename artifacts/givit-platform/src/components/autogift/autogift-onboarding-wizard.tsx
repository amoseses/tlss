import { useState } from "react";
import { useLocation } from "wouter";
import { X, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { saveGiftRecipient } from "@/lib/supabase/db";

type Step = "welcome" | "address" | "payment" | "recipient" | "done";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];

export function AutoGiftOnboardingWizard({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Address
  const [address, setAddress] = useState({ label: "", line1: "", city: "", state: "", zip: "", country: "US" });
  // Payment (simplified - in production use Stripe Elements)
  const [cardBrand, setCardBrand] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  // Recipient
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [occasionLabel, setOccasionLabel] = useState("Birthday");
  const [occasionDate, setOccasionDate] = useState("");

  function next() {
    if (step === "welcome") setStep("address");
    else if (step === "address") setStep("payment");
    else if (step === "payment") setStep("recipient");
    else if (step === "recipient") setStep("done");
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
      if (recipientName.trim()) {
        await saveGiftRecipient({
          user_id: user.id,
          name: recipientName.trim(),
          relationship: relationship || null,
          occasions: occasionDate ? [{ label: occasionLabel, date: occasionDate }] : [],
        } as any);
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
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
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
              <p className="text-sm text-muted-foreground">You'll approve each purchase before any charge. For now, just confirm your card details.</p>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Card brand</label>
                <select value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">Select...</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">Amex</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Last 4 digits</label>
                <input value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
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