import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, CheckCircle } from "lucide-react";
import { respondToSurvey, generateGiftSuggestions, createAutoGiftOrder, getAutoGiftOrders, type SurveyResponse, type GiftSuggestion, type AutoGiftOrderItem } from "@/lib/autogift/survey";

const INTEREST_OPTIONS = [
  "tech", "reading", "cooking", "fitness", "music", "coffee", 
  "gaming", "travel", "plants", "art", "fashion", "outdoor", "pets"
];

const STYLE_OPTIONS = [
  { value: "practical", label: "Practical — something they actually need" },
  { value: "surprise", label: "Surprise — something fun and unexpected" },
  { value: "sentimental", label: "Sentimental — thoughtful and personal" },
  { value: "experience", label: "Experience — an activity or outing" },
];

export function GiftSurveyModal({ 
  recipientName, 
  occasion, 
  occasionDate,
  onClose 
}: { 
  recipientName: string;
  occasion: string;
  occasionDate: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"survey" | "suggestions" | "review" | "done">("survey");
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState(50);
  const [giftStyle, setGiftStyle] = useState<string>("practical");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [cardMessage, setCardMessage] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "", state: "", zip: "" });

  function handleSurveySubmit() {
    const response: SurveyResponse = {
      interests,
      budget,
      avoidItems: [],
      giftStyle: giftStyle as SurveyResponse["giftStyle"],
      notes,
    };
    const surveyId = `survey-${Date.now()}`;
    respondToSurvey(surveyId, response);
    const results = generateGiftSuggestions(response);
    setSuggestions(results);
    setSelectedSuggestionIds(new Set(results.map(r => r.id)));
    setStep("suggestions");
  }

  function toggleSuggestion(id: string) {
    const next = new Set(selectedSuggestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSuggestionIds(next);
  }

  function handlePlaceOrder() {
    const selectedItems = suggestions
      .filter(s => selectedSuggestionIds.has(s.id))
      .map(s => ({
        productName: s.name,
        category: s.category as AutoGiftOrderItem["category"],
        price: s.price,
        quantity: 1,
      }));

    createAutoGiftOrder({
      userId: "local-user",
      recipientName,
      occasion,
      items: selectedItems,
      shippingAddress: { ...address, line2: "" },
      cardMessage,
    });
    setStep("done");
  }

  const selectedTotal = suggestions
    .filter(s => selectedSuggestionIds.has(s.id))
    .reduce((sum, s) => sum + s.price, 0);
  const serviceFee = Math.round(selectedTotal * 0.1);
  const grandTotal = selectedTotal + serviceFee;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">
            Gift for {recipientName}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* SURVEY STEP */}
          {step === "survey" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Tell us about {recipientName} for their {occasion}. 
                We use this to find the perfect gift and build their package.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-semibold">What are they into? (pick 2-4)</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => setInterests(prev => 
                        prev.includes(interest) 
                          ? prev.filter(i => i !== interest)
                          : [...prev, interest]
                      )}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        interests.includes(interest)
                          ? "bg-givit-ember text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Budget per gift (USD)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={15}
                    max={300}
                    step={5}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="flex-1 accent-givit-ember"
                  />
                  <span className="min-w-[60px] text-sm font-bold text-givit-ember">${budget}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Gift style</label>
                {STYLE_OPTIONS.map(style => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setGiftStyle(style.value)}
                    className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                      giftStyle === style.value
                        ? "border-givit-ember bg-givit-ember/5 text-givit-ink"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Any notes for our concierge?</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. They love dark chocolate, hate clutter, recently moved..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>

              <Button onClick={handleSurveySubmit} className="w-full rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                <Sparkles className="h-4 w-4" /> Generate gift ideas
              </Button>
            </div>
          )}

          {/* SUGGESTIONS STEP */}
          {step === "suggestions" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Here are our AI-generated suggestions for {recipientName}'s {occasion}. 
                Select the items to include in their gift package.
              </p>

              <div className="space-y-2.5">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => toggleSuggestion(suggestion.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                      selectedSuggestionIds.has(suggestion.id)
                        ? "border-givit-ember bg-givit-ember/5"
                        : "border-border hover:border-givit-ember/30"
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selectedSuggestionIds.has(suggestion.id)
                        ? "border-givit-ember bg-givit-ember text-white"
                        : "border-border"
                    }`}>
                      {selectedSuggestionIds.has(suggestion.id) && (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{suggestion.name}</p>
                        <span className="text-sm font-bold text-givit-ember">${(suggestion.price / 100).toFixed(2)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.reason}</p>
                      {suggestion.category !== "card" && suggestion.category !== "flowers" && (
                        <span className="mt-1 inline-block rounded-full bg-givit-ember/10 px-2 py-0.5 text-[10px] font-medium text-givit-ember">
                          {suggestion.rating}/100 match
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${(selectedTotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service fee (10%)</span>
                  <span>${(serviceFee / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1 font-bold text-foreground">
                  <span>Total</span>
                  <span>${(grandTotal / 100).toFixed(2)}</span>
                </div>
              </div>

              <Button 
                onClick={() => setStep("review")} 
                disabled={selectedSuggestionIds.size === 0}
                className="w-full rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover"
              >
                Continue to shipping & card
              </Button>
            </div>
          )}

          {/* REVIEW + SHIPPING STEP */}
          {step === "review" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Finalize the package. Nothing is charged until you approve; after approval we charge the saved card from your first AutoGift setup/order and send the order to admin fulfillment.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Shipping address</label>
                <input value={address.line1} onChange={(e) => setAddress(a => ({ ...a, line1: e.target.value }))} placeholder="Street address *" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="City *" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                  <input value={address.state} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="State *" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                  <input value={address.zip} onChange={(e) => setAddress(a => ({ ...a, zip: e.target.value }))} placeholder="ZIP *" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Card message</label>
                <textarea
                  value={cardMessage}
                  onChange={(e) => setCardMessage(e.target.value)}
                  rows={3}
                  placeholder="Write a personalized message for the card..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>

              <div className="rounded-lg bg-givit-ember/5 border border-givit-ember/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-givit-ink">Order summary</p>
                {suggestions.filter(s => selectedSuggestionIds.has(s.id)).map(s => (
                  <div key={s.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-medium">${(s.price / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-givit-ember/20 pt-2 flex justify-between text-sm font-bold text-givit-ink">
                  <span>Total (incl. 10% service fee)</span>
                  <span>${(grandTotal / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setStep("suggestions")}>
                  Back
                </Button>
                <Button 
                  onClick={handlePlaceOrder}
                  disabled={!address.line1 || !address.city || !address.state || !address.zip}
                  className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover"
                >
                  <Sparkles className="h-4 w-4" /> Approve & send to admin — ${(grandTotal / 100).toFixed(2)}
                </Button>
              </div>
            </div>
          )}

          {/* DONE STEP */}
          {step === "done" && (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-givit-ink">Gift order placed!</h3>
              <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
                Your AutoGift order for {recipientName}'s {occasion} has been submitted.
                Your saved card will be charged for the approved total, then the order goes to the admin queue for sourcing, packaging, and shipping.
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Card message: "{cardMessage || "No card message"}"</p>
                {address.line1 && <p>Shipping to: {address.line1}, {address.city}, {address.state} {address.zip}</p>}
              </div>
              <Button onClick={onClose} className="mt-6 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}