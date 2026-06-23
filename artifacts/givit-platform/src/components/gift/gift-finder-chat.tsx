import { useState, useRef, useEffect } from "react";
import { AlertTriangle, ExternalLink, Send, Sparkles, Star, ThumbsDown, ThumbsUp, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { WishlistButton } from "@/components/product/wishlist-button";
import { recommendGifts, type GiftRecommendResult } from "@/lib/gift-recommend";

type GiftResult = GiftRecommendResult;

type Message = {
  role: "user" | "assistant";
  content: string;
  results?: GiftResult[];
  loading?: boolean;
};

type Questionnaire = {
  recipient: string;
  relationship: string;
  occasion: string;
  budget: string;
  interests: string;
  style: string;
  avoid: string;
};

const GREETING: Message = {
  role: "assistant",
  content: "Hey! I'm Givit — your gifting companion. Tell me who you're shopping for, the occasion, and your budget, and I'll suggest thoughtful picks with a reason for each one.",
};

const QUICK_PROMPTS = [
  { label: "For Mom 🌸", prompt: "Gift for my mom, birthday, $50 budget, loves cooking and gardening, thoughtful style, avoid clutter" },
  { label: "For Dad 🔧", prompt: "Gift for my dad, birthday, under $75, likes tools, coffee, and outdoors, practical style, avoid clothes" },
  { label: "For Friend 🎉", prompt: "Gift for a close friend, just because, $30-$50, likes fun design and cozy nights, avoid generic mugs" },
  { label: "For Partner 💝", prompt: "Romantic anniversary gift for my partner, $100 budget, likes travel, coffee, and keepsakes" },
  { label: "Graduation 🎓", prompt: "Graduation gift for a student, $80 budget, likes tech, studying, and travel" },
  { label: "Pens ✍️", prompt: "Gift for a teacher who loves pens and journaling, thank-you gift, under $30" },
];

const OCCASIONS = ["Birthday", "Anniversary", "Christmas", "Graduation", "Wedding", "Holiday", "Housewarming", "Thank you", "Father's Day", "Mother's Day", "Valentine's Day", "Easter", "Halloween", "New Baby", "Retirement", "Get Well", "Just Because", "Engagement", "Baby Shower"];
const STYLES = ["Practical", "Sentimental", "Unique", "Luxury", "Cozy", "Funny", "Minimal", "Experience-like"];

type LearningProfile = {
  productWeights: Record<string, number>;
  tagWeights: Record<string, number>;
};

const LEARNING_KEY = "givit-ai-learning-profile";

function readLearningProfile(): LearningProfile {
  try {
    const raw = window.localStorage.getItem(LEARNING_KEY);
    return raw ? (JSON.parse(raw) as LearningProfile) : { productWeights: {}, tagWeights: {} };
  } catch {
    return { productWeights: {}, tagWeights: {} };
  }
}

function writeLearningProfile(profile: LearningProfile) {
  window.localStorage.setItem(LEARNING_KEY, JSON.stringify(profile));
}

function applyFeedback(results: GiftResult[], satisfied: boolean) {
  const profile = readLearningProfile();
  const direction = satisfied ? 1 : -1;
  for (const result of results) {
    profile.productWeights[result.slug] = Math.max(-3, Math.min(3, (profile.productWeights[result.slug] ?? 0) + direction * 0.5));
    for (const tag of result.learning_tags ?? result.gift_tags) {
      profile.tagWeights[tag] = Math.max(-3, Math.min(3, (profile.tagWeights[tag] ?? 0) + direction * 0.25));
    }
  }
  writeLearningProfile(profile);
}

function formatMoneyLocal(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function buildQuestionnairePrompt(form: Questionnaire) {
  return [
    `Recipient: ${form.recipient || "not specified"}`,
    `Relationship: ${form.relationship || "not specified"}`,
    `Occasion: ${form.occasion || "not specified"}`,
    `Budget: ${form.budget || "flexible"}`,
    `Interests: ${form.interests || "not specified"}`,
    `Style: ${form.style || "balanced"}`,
    `Avoid: ${form.avoid || "none listed"}`,
  ].join(". ");
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-givit-ember">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-muted-foreground">Givit is thinking…</span>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}

function GiftCard({ result, index }: { result: GiftResult; index: number }) {
  const score = result.gift_score?.total ?? 90;
  const displayPrice = result.sale_price_cents ?? result.price_cents;

  return (
    <div className="slide-up givit-panel overflow-hidden transition-transform duration-200 hover:-translate-y-0.5" style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-givit-sand">
        {result.image_url ? (
          <img src={result.image_url} alt={result.name} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl">🎁</span></div>
        )}
        <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-givit-ember shadow-sm">
          Gift Match Score: {score}/100
        </div>
        {result.sale_price_cents ? (
          <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">Sale</div>
        ) : null}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="line-clamp-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm">✨ {result.match_reason}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{result.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="font-bold text-givit-ember">{formatMoneyLocal(displayPrice)}</p>
          {result.sale_price_cents ? <p className="text-xs text-muted-foreground line-through">{formatMoneyLocal(result.price_cents)}</p> : null}
        </div>
        {result.avg_rating && result.review_count > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">{Number(result.avg_rating).toFixed(1)} ({result.review_count})</span>
          </div>
        )}
        {result.avoidance_warning ? (
          <div className="mt-2 flex gap-1.5 rounded-xl bg-amber-50 p-2 text-[11px] leading-4 text-amber-800">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{result.avoidance_warning}</span>
          </div>
        ) : null}
        {result.gift_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {result.gift_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-givit-sand px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-3 grid gap-2">
          <Link href={`/products/${result.slug}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-givit-ember px-3 text-xs font-semibold text-white transition hover:bg-givit-ember-hover">
            <ExternalLink className="h-3.5 w-3.5" /> View product
          </Link>
          <WishlistButton compact item={{ slug: result.slug, name: result.name, href: `/products/${result.slug}`, image: result.image_url ?? undefined, price: formatMoneyLocal(displayPrice) }} />
          <Link href="/concierge" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-givit-ember/30 px-3 text-xs font-semibold text-givit-ember transition hover:bg-givit-ember/10">
            Build full bundle
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GiftFinderChat() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [form, setForm] = useState<Questionnaire>({ recipient: "", relationship: "", occasion: "Birthday", budget: "", interests: "", style: "Practical", avoid: "" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startOver() {
    setMessages([GREETING]);
    setInput("");
    setLastQuery("");
    setForm({ recipient: "", relationship: "", occasion: "Birthday", budget: "", interests: "", style: "Practical", avoid: "" });
    inputRef.current?.focus();
  }

  async function regenerate() {
    if (!lastQuery || loading) return;
    await sendMessage(lastQuery, true);
  }

  async function sendMessage(text: string, isRegenerate = false) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!isRegenerate) setLastQuery(trimmed);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }, { role: "assistant", content: "", loading: true }]);
    setInput("");
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));
      const data = recommendGifts(trimmed, readLearningProfile());
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: data.message ?? "", results: data.results ?? [] }]);
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: "I hit a snag while ranking gifts. Try again with recipient, occasion, budget, interests, and avoid-list details." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleFeedback(results: GiftResult[], satisfied: boolean) {
    applyFeedback(results, satisfied);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: satisfied ? "Great — I saved those positive signals. ✅" : "Got it — I saved that these were not quite right." },
    ]);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="givit-panel h-fit p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-givit-ember text-white"><Wand2 className="h-4 w-4" /></div>
          <div>
            <h2 className="font-serif text-xl font-bold text-givit-ink">Gift questionnaire</h2>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Who is it for?" value={form.recipient} placeholder="Mom, partner, boss..." onChange={(recipient) => setForm((prev) => ({ ...prev, recipient }))} />
          <Field label="Relationship" value={form.relationship} placeholder="Close, formal..." onChange={(relationship) => setForm((prev) => ({ ...prev, relationship }))} />
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-givit-ink">Occasion</label>
            <select value={form.occasion} onChange={(e) => setForm((prev) => ({ ...prev, occasion: e.target.value }))} className="h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
              {OCCASIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <Field label="Budget" value={form.budget} placeholder="Under $75" onChange={(budget) => setForm((prev) => ({ ...prev, budget }))} />
          <Field label="Interests" value={form.interests} placeholder="Coffee, running, books..." onChange={(interests) => setForm((prev) => ({ ...prev, interests }))} />
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-givit-ink">Gift style</label>
            <select value={form.style} onChange={(e) => setForm((prev) => ({ ...prev, style: e.target.value }))} className="h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
              {STYLES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <Field label="Avoid" value={form.avoid} placeholder="Clothes, alcohol, clutter..." onChange={(avoid) => setForm((prev) => ({ ...prev, avoid }))} />
          <button
            type="button"
            onClick={() => sendMessage(buildQuestionnairePrompt(form))}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-givit-ember text-sm font-bold text-white transition hover:bg-givit-ember-hover"
          >
            Analyze gifts <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div>
        {messages.length === 1 && (
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button key={qp.label} type="button" onClick={() => sendMessage(qp.prompt)} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-givit-ember/40 hover:bg-givit-sand hover:text-givit-ember">
                {qp.label}
              </button>
            ))}
          </div>
        )}

        <div className="givit-panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground">Givit AI · Gift Finder</p>
            <div className="flex gap-1.5">
              {lastQuery && !loading && (
                <button type="button" onClick={regenerate} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition">
                  <Wand2 className="h-3 w-3" /> Regenerate
                </button>
              )}
              <button type="button" onClick={startOver} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition">
                ↺ Start over
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-5 overflow-y-auto p-5" style={{ maxHeight: "65vh" }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end"><div className="chat-bubble-user max-w-[80%] text-sm leading-relaxed">{msg.content}</div></div>
                ) : msg.loading ? (
                  <TypingIndicator />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-end gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-givit-ember"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
                      {msg.content && <div className="chat-bubble-ai max-w-[85%] text-sm leading-relaxed">{msg.content}</div>}
                    </div>
                    {msg.results && msg.results.length > 0 && (
                      <div className="ml-0 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {msg.results.map((result, idx) => <GiftCard key={result.id} result={result} index={idx} />)}
                        <div className="rounded-2xl border border-border/60 bg-white p-3 text-xs text-muted-foreground sm:col-span-2 xl:col-span-3">
                          <div className="mb-2 font-semibold text-givit-ink">Did these feel right?</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleFeedback(msg.results ?? [], true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-100"><ThumbsUp className="h-3.5 w-3.5" /> Satisfied</button>
                            <button type="button" onClick={() => handleFeedback(msg.results ?? [], false)} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-100"><ThumbsDown className="h-3.5 w-3.5" /> Not yet</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.results && msg.results.length === 0 && (
                      <div className="ml-11 rounded-2xl border border-border/40 bg-givit-sand p-4 text-sm text-muted-foreground">
                        No exact matches found. Try different keywords or <Link href="/products" className="givit-link font-medium">shop the marketplace</Link>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Tell me more, adjust the budget, or ask for different ideas..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ maxHeight: "120px" }}
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-givit-ember text-white transition-all hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-bold text-givit-ink">{label}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-givit-ember/20" />
    </div>
  );
}
