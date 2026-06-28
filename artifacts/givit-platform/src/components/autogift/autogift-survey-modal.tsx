import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, CheckCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { respondToSurvey, generateGiftBundles, regenerateBundleItem, createAutoGiftOrder, type SurveyResponse, type GiftSuggestion, type AutoGiftBundle, type AutoGiftOrderItem } from "@/lib/autogift/survey";
import { trackUserEvent } from "@/lib/monitoring";

const INTEREST_OPTIONS = [
  "tech", "reading", "cooking", "fitness", "music", "coffee",
  "gaming", "travel", "plants", "art", "fashion", "outdoor", "pets",
  "wellness", "crafts", "beauty", "home", "foodie", "sports", "learning", "local experiences"
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
  const [packageType, setPackageType] = useState<"full" | "recommendations">("full");
  const [notes, setNotes] = useState("");
  const [bundles, setBundles] = useState<AutoGiftBundle[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [addressOptions, setAddressOptions] = useState<Array<{ label?: string; line1: string; city: string; state: string; zip: string }>>([]);
  const [address, setAddress] = useState({ label: "", line1: "", city: "", state: "", zip: "" });
  const [page, setPage] = useState(0);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemFeedback, setItemFeedback] = useState<Record<string, "liked" | "disliked">>({});

  const currentResponse: SurveyResponse = {
    interests,
    budget,
    avoidItems: [],
    giftStyle: giftStyle as SurveyResponse["giftStyle"],
    notes: `${notes}${packageType === "full" ? " Full bundle requested." : " One strong gift requested."}`,
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("givit-autogift-addresses") ?? "[]");
      if (Array.isArray(saved) && saved.length) {
        setAddressOptions(saved);
        setAddress({ label: saved[0].label || "", line1: saved[0].line1, city: saved[0].city, state: saved[0].state, zip: saved[0].zip });
      }
    } catch { /* ignore malformed local demo data */ }
  }, []);

  function buildSuggestions(nextRegenerationCount = regenerationCount) {
    const response = currentResponse;
    const surveyId = `survey-${Date.now()}`;
    respondToSurvey(surveyId, response);
    const nextBundles = generateGiftBundles({ ...response, notes: `${response.notes} Variation ${nextRegenerationCount}.` });
    const normalizedBundles = packageType === "recommendations"
      ? nextBundles.map((bundle, index) => ({ ...bundle, title: `Option ${index + 1}: One gift idea`, items: bundle.items.filter((item) => item.category === "gift" || item.category === "activity").slice(0, 1) }))
      : nextBundles;
    setBundles(normalizedBundles);
    setSelectedBundleId(normalizedBundles[0]?.id || "");
    setItemNotes(Object.fromEntries(normalizedBundles.flatMap((bundle) => bundle.items.map((r) => [r.id, r.fulfillmentNotes || ""]))));
    setPage(0);
    trackUserEvent("autogift_suggestions_generated", { packageType, bundleCount: normalizedBundles.length, interests });
    setStep("suggestions");
  }

  function handleSurveySubmit() {
    buildSuggestions();
  }

  function regenerateSuggestions() {
    const next = regenerationCount + 1;
    setRegenerationCount(next);
    buildSuggestions(next);
  }

  function updateBundleItem(bundleId: string, itemId: string, updates: Partial<GiftSuggestion>) {
    setBundles((prev) => prev.map((bundle) => bundle.id === bundleId ? { ...bundle, items: bundle.items.map((item) => item.id === itemId ? { ...item, ...updates } : item) } : bundle));
  }

  function removeBundleItem(bundleId: string, itemId: string) {
    setBundles((prev) => prev.map((bundle) => bundle.id === bundleId ? { ...bundle, items: bundle.items.filter((item) => item.id !== itemId) } : bundle));
  }

  function replaceBundleItem(bundleId: string, item: GiftSuggestion) {
    const replacement = regenerateBundleItem(currentResponse, item, regenerationCount + 1);
    setRegenerationCount((n) => n + 1);
    setBundles((prev) => prev.map((bundle) => bundle.id === bundleId ? { ...bundle, items: bundle.items.map((existing) => existing.id === item.id ? replacement : existing) } : bundle));
    setItemNotes((prev) => ({ ...prev, [replacement.id]: replacement.fulfillmentNotes || "" }));
  }

  function rateBundleItem(item: GiftSuggestion, liked: boolean) {
    setItemFeedback((prev) => ({ ...prev, [item.id]: liked ? "liked" : "disliked" }));
    trackUserEvent("autogift_item_feedback", { itemName: item.name, category: item.category, liked });
  }

  function handlePlaceOrder() {
    const selectedItems = selectedBundle.items
      .map(s => ({
        productName: s.name,
        category: s.category as AutoGiftOrderItem["category"],
        price: s.price,
        productUrl: s.productUrl,
        imageUrl: s.imageUrl,
        quantity: 1,
        notes: [itemNotes[s.id], itemFeedback[s.id] ? `User marked this item as ${itemFeedback[s.id]}.` : ""].filter(Boolean).join(" "),
      }));

    trackUserEvent("autogift_order_approved", { recipientName, occasion, itemCount: selectedItems.length, total: grandTotal });
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

  const selectedBundle = bundles.find((bundle) => bundle.id === selectedBundleId) ?? bundles[0] ?? { id: "", title: "", description: "", items: [] };
  const selectedTotal = selectedBundle.items.reduce((sum, s) => sum + s.price, 0);
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
                Tell us about {recipientName} for their {occasion}. We prefilled the AutoGift context and will recommend a bundle with human touches like cards, flowers, and experiences when they fit.
              </p>


              <div className="space-y-2">
                <label className="text-sm font-semibold">Package size</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setPackageType("full")} className={`rounded-lg border p-3 text-left text-sm ${packageType === "full" ? "border-givit-ember bg-givit-ember/5" : "border-border"}`}><b>Bundle</b><br /><span className="text-xs text-muted-foreground">More than one gift. Cards, flowers, or experiences appear only when they truly fit. Edit, remove, or replace one item at a time.</span></button>
                  <button type="button" onClick={() => setPackageType("recommendations")} className={`rounded-lg border p-3 text-left text-sm ${packageType === "recommendations" ? "border-givit-ember bg-givit-ember/5" : "border-border"}`}><b>One nice gift</b><br /><span className="text-xs text-muted-foreground">Focus the budget on one strong standalone gift instead of a bundle.</span></button>
                </div>
              </div>

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
                Givit AI built three orderable options. Click through bundle pages, choose one, then regenerate or edit individual items inside that bundle.
              </p>
              <div className="flex flex-wrap gap-2">
                {bundles.map((bundle, index) => (
                  <Button key={bundle.id} type="button" variant={selectedBundleId === bundle.id ? "default" : "outline"} className={`rounded-lg ${selectedBundleId === bundle.id ? "bg-givit-ember text-white hover:bg-givit-ember-hover" : ""}`} onClick={() => { setSelectedBundleId(bundle.id); setPage(index); }}>
                    Option {index + 1}
                  </Button>
                ))}
              </div>
              {selectedBundle.id && (
                <div className="overflow-hidden rounded-xl border border-givit-ember/25 bg-givit-ember/5">
                  <div className="border-b border-givit-ember/20 bg-gradient-to-r from-givit-ember/15 via-pink-100 to-white p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Bundle page {Math.max(0, page) + 1} of {bundles.length}</p>
                    <h3 className="mt-1 font-serif text-xl font-bold text-givit-ink">{selectedBundle.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedBundle.description}</p>
                  </div>
                  <div className="space-y-3 p-4">
                    {selectedBundle.items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-white p-3">
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />}
                        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.reason}</p></div><span className="font-bold text-givit-ember">${(item.price / 100).toFixed(2)}</span></div>
                        {item.productUrl && <a href={item.productUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-givit-ember underline">View exact product</a>}
                        <textarea value={itemNotes[item.id] || ""} onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))} rows={2} placeholder="Notes for this item: color, size, allergies, delivery timing..." className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                        <div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={item.name} onChange={(e) => updateBundleItem(selectedBundle.id, item.id, { name: e.target.value })} className="h-9 rounded-md border border-border bg-background px-3 text-sm" /><input type="number" value={(item.price / 100).toFixed(2)} onChange={(e) => updateBundleItem(selectedBundle.id, item.id, { price: Math.round(Number(e.target.value || 0) * 100) })} className="h-9 rounded-md border border-border bg-background px-3 text-sm" /></div>
                        <div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="rounded-lg text-emerald-700" onClick={() => rateBundleItem(item, true)}><ThumbsUp className="h-3.5 w-3.5" /> Like this</Button><Button type="button" variant="outline" size="sm" className="rounded-lg text-rose-700" onClick={() => rateBundleItem(item, false)}><ThumbsDown className="h-3.5 w-3.5" /> Not this</Button><Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => replaceBundleItem(selectedBundle.id, item)}>Regenerate item</Button><Button type="button" variant="outline" size="sm" className="rounded-lg text-destructive" onClick={() => removeBundleItem(selectedBundle.id, item.id)}>Remove</Button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => { const next = Math.max(0, page - 1); setPage(next); setSelectedBundleId(bundles[next]?.id || selectedBundleId); }} disabled={page === 0}>Previous bundle</Button><Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => { const next = Math.min(bundles.length - 1, page + 1); setPage(next); setSelectedBundleId(bundles[next]?.id || selectedBundleId); }} disabled={page >= bundles.length - 1}>Next bundle</Button><Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={regenerateSuggestions}>Regenerate all</Button></div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${(selectedTotal / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Service fee (10%)</span><span>${(serviceFee / 100).toFixed(2)}</span></div>
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold text-foreground"><span>Total</span><span>${(grandTotal / 100).toFixed(2)}</span></div>
              </div>
              <Button onClick={() => setStep("review")} disabled={selectedBundle.items.length === 0} className="w-full rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Order this option</Button>
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
                {addressOptions.length > 1 && <select value={address.label || address.line1} onChange={(e) => { const selected = addressOptions.find((item) => (item.label || item.line1) === e.target.value); if (selected) setAddress({ label: selected.label || "", line1: selected.line1, city: selected.city, state: selected.state, zip: selected.zip }); }} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose saved address...</option>{addressOptions.map((item) => <option key={`${item.label}-${item.line1}`} value={item.label || item.line1}>{item.label || item.line1}</option>)}</select>}
                {addressOptions.length === 1 && <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Using saved address: {addressOptions[0].label || addressOptions[0].line1}</p>}
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
                {selectedBundle.items.map(s => (
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