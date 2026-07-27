import { useState, useRef, useEffect } from "react";
import { AlertTriangle, ExternalLink, Send, Sparkles, Star, ThumbsDown, ThumbsUp, Wand2, UserRound } from "lucide-react";
import { Link } from "wouter";
import { WishlistButton } from "@/components/product/wishlist-button";
import { recommendGifts, EMPTY_CONTEXT, type GiftRecommendResult, type ParsedContext } from "@/lib/gift-recommend";
import { fetchAllProducts, getAllMarketplaceProducts, type MarketplaceProduct } from "@/lib/data/data-layer";
import { personalizeChatResponse, personalizeFollowUpMessage, personalizeGeneralQuestion } from "@/lib/ai/gift-chat-personalize";
import { readLearningProfile, applyFeedback as applyLearningFeedback } from "@/lib/gift-learning";
import { productPhotoFallback } from "@/lib/product-photo";
import { logError, trackUserEvent } from "@/lib/monitoring";
import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients, saveGiftRecipient } from "@/lib/supabase/db";

type GiftResult = GiftRecommendResult;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: GiftResult[];
  loading?: boolean;
  needsFollowUp?: boolean;
  generalQuestion?: boolean;
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
  id: "greeting",
  role: "assistant",
  content: "Hey! I'm GIVIT, your gifting companion. Tell me who you're shopping for, the occasion, and your budget, and I'll suggest thoughtful picks with a reason for each one.",
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

function formatMoneyLocal(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type SavedRecipient = {
  id: string;
  name: string;
  relationship?: string | null;
  interests?: string[] | null;
  avoid_terms?: string[] | null;
  default_budget_cents?: number | null;
  notes?: string | null;
};

// Turns a saved AutoGift recipient profile into the same free-text shape
// the chat already knows how to parse — this is the "memory layer": the
// interests/avoid-list/budget were captured once in AutoGift and now drive
// a GIVIT AI query with zero retyping.
function buildRecipientPrompt(r: SavedRecipient) {
  const parts = [`Gift for ${r.name}${r.relationship ? ` (${r.relationship})` : ""}`];
  if (r.default_budget_cents) parts.push(`budget ${formatMoneyLocal(r.default_budget_cents)}`);
  if (r.interests?.length) parts.push(`loves ${r.interests.join(", ")}`);
  if (r.avoid_terms?.length) parts.push(`avoid ${r.avoid_terms.join(", ")}`);
  if (r.notes?.trim()) parts.push(r.notes.trim());
  return parts.join(", ");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// If the shopper just types "gift for Mom" instead of tapping her chip,
// the AI shouldn't ask the questions it already has answers to: this
// finds a saved recipient by name in the typed message so her known
// interests/avoid-list/budget can be folded into scoring, and so item
// feedback later in the conversation can be attributed back to her.
function findSavedRecipient(text: string, recipients: SavedRecipient[]): SavedRecipient | undefined {
  return recipients.find((r) => r.name.trim() && new RegExp(`\\b${escapeRegExp(r.name.trim())}\\b`, "i").test(text));
}

// "What are my mom's interests" / "what do you know about Sarah" — matches
// either by name or by the saved relationship label (e.g. "mom"), so asking
// about a relationship works even when the shopper never types the name.
function findRecipientByNameOrRelationship(text: string, recipients: SavedRecipient[]): SavedRecipient | undefined {
  const byName = findSavedRecipient(text, recipients);
  if (byName) return byName;
  const lower = text.toLowerCase();
  return recipients.find((r) => r.relationship?.trim() && lower.includes(r.relationship.trim().toLowerCase()));
}

// Deliberately requires an "interests/saved/know about" style phrase AND
// excludes gift-shopping wording, so this only intercepts real "what do you
// have on file for X" recall questions, never a normal gift request that
// happens to mention someone's interests in passing.
const RECALL_PATTERN = /\b(interests?|likes?|loves?|know about|saved|remember|have (?:for|on|about))\b/i;
const RECALL_EXCLUDE_PATTERN = /\b(gift|present|buy|shop|shopping)\b|\$\d/i;

// Answers straight from the real saved profile — no AI involved, so there's
// zero risk of it inventing interests the person never actually saved.
function buildRecallAnswer(r: SavedRecipient): string {
  const parts: string[] = [];
  parts.push(
    r.interests?.length
      ? `${r.name}'s saved interests: ${r.interests.join(", ")}.`
      : `I don't have any interests saved for ${r.name} yet.`,
  );
  if (r.avoid_terms?.length) parts.push(`Avoid list: ${r.avoid_terms.join(", ")}.`);
  if (r.default_budget_cents) parts.push(`Default budget: ${formatMoneyLocal(r.default_budget_cents)}.`);
  if (r.notes?.trim()) parts.push(`Notes: ${r.notes.trim()}`);
  parts.push(`Want to add more? Edit ${r.name}'s profile on the People page.`);
  return parts.join(" ");
}

// Silently folds a matched recipient's known interests/avoid-list/budget
// into what gets sent for scoring, without changing what's shown as the
// user's own chat bubble.
function augmentWithSavedRecipient(text: string, matched: SavedRecipient | undefined): string {
  if (!matched) return text;

  const extras: string[] = [];
  if (matched.relationship) extras.push(matched.relationship);
  if (matched.interests?.length) extras.push(`loves ${matched.interests.join(", ")}`);
  if (matched.avoid_terms?.length) extras.push(`avoid ${matched.avoid_terms.join(", ")}`);
  if (matched.default_budget_cents) extras.push(`budget ${formatMoneyLocal(matched.default_budget_cents)}`);
  if (extras.length === 0) return text;
  return `${text} (${extras.join(", ")})`;
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
        <span className="text-[10px] font-semibold text-muted-foreground">GIVIT is thinking…</span>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}

function GiftCard({ result, index, onItemFeedback }: { result: GiftResult; index: number; onItemFeedback: (result: GiftResult, liked: boolean) => void }) {
  const [imageSrc, setImageSrc] = useState(result.image_url || productPhotoFallback(result.slug, result.category_slug));
  // Tapping Like/Not this used to give zero visual confirmation — the
  // buttons looked identical before and after a click, so users couldn't
  // tell their feedback registered. This tracks it locally per card.
  const [feedback, setFeedback] = useState<"liked" | "disliked" | null>(null);
  const displayPrice = result.sale_price_cents ?? result.price_cents;

  return (
    <div className="slide-up givit-panel overflow-hidden transition-transform duration-200 hover:-translate-y-0.5" style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-givit-sand">
        {result.image_url ? (
          <img src={imageSrc} alt={result.name} className="h-full w-full object-cover" onError={() => setImageSrc(productPhotoFallback(result.slug, result.category_slug))} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl">🎁</span></div>
        )}
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
          <WishlistButton compact item={{ slug: result.slug, name: result.name, href: `/products/${result.slug}`, image: imageSrc, price: formatMoneyLocal(displayPrice) }} />
          {feedback ? (
            <div className={`flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold ${feedback === "liked" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {feedback === "liked" ? <ThumbsUp className="h-3.5 w-3.5 fill-current" /> : <ThumbsDown className="h-3.5 w-3.5 fill-current" />}
              {feedback === "liked" ? "Noted — more like this" : "Noted — less like this"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setFeedback("liked"); onItemFeedback(result, true); }}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-emerald-200 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Like item
              </button>
              <button
                type="button"
                onClick={() => { setFeedback("disliked"); onItemFeedback(result, false); }}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-rose-200 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Not this
              </button>
            </div>
          )}
          <Link href="/concierge" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-givit-ember/30 px-3 text-xs font-semibold text-givit-ember transition hover:bg-givit-ember/10">
            Build full bundle
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GiftFinderChat({ initialQuery }: { initialQuery?: string } = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [form, setForm] = useState<Questionnaire>({ recipient: "", relationship: "", occasion: "Birthday", budget: "", interests: "", style: "Practical", avoid: "" });
  // Saved AutoGift recipient profiles double as one-tap starting points here
  // — their interests/avoid-list/budget were already captured once, so
  // reusing them avoids making the shopper retype what GIVIT already knows.
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  useEffect(() => {
    if (!user) { setSavedRecipients([]); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows) => { if (mounted) setSavedRecipients(rows as SavedRecipient[]); });
    return () => { mounted = false; };
  }, [user]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Accumulates recipient/occasion/budget/interests across turns so
  // answering a follow-up question (e.g. "her birthday") doesn't lose what
  // was already said and get asked the same question again.
  const contextRef = useRef<ParsedContext>(EMPTY_CONTEXT);
  // Whichever saved person the current query was recognized as being for,
  // so a Like/Not-this on one of her results can be written back to her
  // profile as real memory, not just an anonymous ranking signal.
  const activeRecipientRef = useRef<SavedRecipient | undefined>(undefined);
  // Ids already shown, so "Not yet" can ask for a genuinely different set
  // instead of just acknowledging and stopping.
  const shownIdsRef = useRef<Set<string>>(new Set());
  // Starts with the static seed catalog (available instantly, no network
  // wait) and upgrades in the background to the Supabase-merged catalog, so
  // admin-added products become real, recommendable candidates instead of
  // items that only exist in the admin dashboard. A ref (not state) because
  // sendMessage just needs the latest value, not a re-render when it lands.
  const catalogRef = useRef<MarketplaceProduct[]>(getAllMarketplaceProducts());

  useEffect(() => {
    let mounted = true;
    fetchAllProducts().then((products) => { if (mounted) catalogRef.current = products; });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // scrollIntoView (even with block: "nearest") walks every scrollable
    // ancestor of the target, not just the closest one — so it was also
    // scrolling the browser window itself down to reveal bottomRef, dragging
    // the whole page to the bottom of the chat panel and burying the just-
    // returned product cards below the fold. Scrolling the container's own
    // scrollTop directly never touches window scroll at all.
    const container = scrollContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQuery?.trim()) sendMessage(initialQuery.trim());
    // Only ever auto-send once, on mount — not on every initialQuery identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startOver() {
    setMessages([GREETING]);
    setInput("");
    setLastQuery("");
    setForm({ recipient: "", relationship: "", occasion: "Birthday", budget: "", interests: "", style: "Practical", avoid: "" });
    contextRef.current = EMPTY_CONTEXT;
    shownIdsRef.current = new Set();
    focusInput();
  }

  // preventScroll: true — inputRef sits at the bottom of the chat panel, and
  // a plain .focus() call makes the browser scroll it into view by default,
  // dragging the whole page down every time a response finishes. The chat's
  // own scroll behavior is handled separately, directly on the message
  // container's scrollTop above.
  function focusInput() {
    inputRef.current?.focus({ preventScroll: true });
  }

  async function regenerate() {
    if (!lastQuery || loading) return;
    await sendMessage(lastQuery, true);
  }

  async function sendMessage(text: string, isRegenerate = false, excludeIds: string[] = []) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // "What are my mom's interests" etc. — answer straight from the real
    // saved profile, no gift search or AI call involved, so it's instant
    // and can't drift from what's actually in the database.
    if (RECALL_PATTERN.test(trimmed) && !RECALL_EXCLUDE_PATTERN.test(trimmed)) {
      const recipient = findRecipientByNameOrRelationship(trimmed, savedRecipients);
      if (recipient) {
        if (!isRegenerate) setLastQuery(trimmed);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", content: trimmed },
          { id: crypto.randomUUID(), role: "assistant", content: buildRecallAnswer(recipient) },
        ]);
        setInput("");
        focusInput();
        return;
      }
    }

    if (!isRegenerate) setLastQuery(trimmed);
    const replyId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }, { id: replyId, role: "assistant", content: "", loading: true }]);
    setInput("");
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const profile = await readLearningProfile();
      const recommendOptions = { priorContext: contextRef.current, excludeIds, catalog: catalogRef.current };
      // If the message names someone already saved (typed "gift for Mom"
      // rather than tapping her chip), fold in what's already known about
      // her so the AI doesn't ask questions it has the answers to; the
      // displayed chat bubble still shows exactly what the user typed.
      activeRecipientRef.current = findSavedRecipient(trimmed, savedRecipients);
      const queryForScoring = augmentWithSavedRecipient(trimmed, activeRecipientRef.current);
      // Score a wider pool (20) than we display (5): the deterministic
      // scorer is a decent first pass, but capping the AI to only the same
      // 5 it would've shown anyway means it can only reword them, never
      // actually pick something the rule-based ranking under-scored. The
      // display-facing message/result count still comes from a normal
      // 5-result call so copy like "here are 5 ideas" stays accurate.
      const widePool = recommendGifts(queryForScoring, profile, 20, recommendOptions);
      const data = recommendGifts(queryForScoring, profile, 5, recommendOptions);
      contextRef.current = data.context;

      // Personalize before ever rendering results, not after — showing the
      // plain deterministic set and then silently swapping it a moment
      // later (once the AI call resolves) reads as the AI generating
      // products twice for one request. personalizeChatResponse already
      // falls back to `data` on timeout/failure, so this can't hang.
      // When there's nothing to show yet, the reply still goes through
      // Groq (personalizeFollowUpMessage) so asking for more detail reads
      // as conversation, not one of a handful of fixed template strings —
      // except when it's the off-topic gate, which stays a fixed, safe
      // reply on purpose rather than letting the model improvise one. A
      // flagged general-knowledge question (see isGeneralKnowledgeQuery)
      // skips gift scoring entirely and gets a real answer instead.
      const final = data.generalQuestion
        ? await personalizeGeneralQuestion(trimmed, data).catch((error) => {
            logError(error, "GiftFinderChat.personalizeGeneralQuestion", { query: trimmed });
            return data;
          })
        : widePool.results && widePool.results.length > 0
        ? await personalizeChatResponse(queryForScoring, data, widePool.results).catch((error) => {
            logError(error, "GiftFinderChat.personalizeChatResponse", { query: trimmed });
            return data;
          })
        : data.needsFollowUp && !data.offTopic
          ? await personalizeFollowUpMessage(queryForScoring, data).catch((error) => {
              logError(error, "GiftFinderChat.personalizeFollowUpMessage", { query: trimmed });
              return data;
            })
          : data;

      (final.results ?? []).forEach((r) => shownIdsRef.current.add(r.id));
      trackUserEvent("ai_recommendation_generated", { queryLength: trimmed.length, resultCount: final.results?.length ?? 0, tags: final.tags });
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: final.message ?? "", results: final.results ?? [], needsFollowUp: final.needsFollowUp, generalQuestion: data.generalQuestion, loading: false } : m)));
      setLoading(false);
      focusInput();
    } catch (error) {
      logError(error, "GiftFinderChat.sendMessage", { query: trimmed });
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, loading: false, content: "I hit a snag while ranking gifts. Try again with recipient, occasion, budget, interests, and avoid-list details." } : m)));
      setLoading(false);
      focusInput();
    }
  }

  function handleFeedback(results: GiftResult[], satisfied: boolean) {
    void applyLearningFeedback(results, satisfied);
    trackUserEvent("ai_recommendation_feedback", { scope: "response", satisfied, slugs: results.map((item) => item.slug) });
    if (satisfied) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Great, I saved those positive signals. ✅" },
      ]);
      return;
    }
    // "Not yet" should actually try again with a different set, not just
    // acknowledge and leave the shopper stuck with picks that missed.
    if (lastQuery) {
      void sendMessage(lastQuery, true, Array.from(shownIdsRef.current));
    } else {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Got it, tell me a bit more about them (interests, budget, or style) and I'll try a different set." },
      ]);
    }
  }

  function handleItemFeedback(result: GiftResult, liked: boolean) {
    void applyLearningFeedback([result], liked);
    trackUserEvent("ai_recommendation_feedback", { scope: "item", liked, slug: result.slug, tags: result.learning_tags ?? result.gift_tags });
    // Item-level thumbs feedback should quietly update ranking signals without adding a new AI chat message.
    void recordFeedbackAsMemory(result, liked);
  }

  // The actual "moat" behavior: a Like/Not-this doesn't just nudge a
  // generic ranking model, it appends to the specific saved person's
  // profile notes when the AI recognized who this query was for, so her
  // profile keeps getting more accurate the more she's shopped for.
  async function recordFeedbackAsMemory(result: GiftResult, liked: boolean) {
    const recipient = activeRecipientRef.current;
    if (!user || !recipient) return;
    const line = `${liked ? "Liked" : "Passed on"}: ${result.name} (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;
    const nextNotes = [recipient.notes?.trim(), line].filter(Boolean).join("\n").slice(-2000);
    const { error } = await saveGiftRecipient({ id: recipient.id, user_id: user.id, name: recipient.name, notes: nextNotes });
    if (error) { console.error("Failed to record gift feedback on recipient:", error); return; }
    activeRecipientRef.current = { ...recipient, notes: nextNotes };
    setSavedRecipients((prev) => prev.map((r) => (r.id === recipient.id ? { ...r, notes: nextNotes } : r)));
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
            <select value={form.occasion} onChange={(e) => setForm((prev) => ({ ...prev, occasion: e.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
              {OCCASIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <Field label="Budget" value={form.budget} placeholder="Under $75" onChange={(budget) => setForm((prev) => ({ ...prev, budget }))} />
          <Field label="Interests" value={form.interests} placeholder="Coffee, running, books..." onChange={(interests) => setForm((prev) => ({ ...prev, interests }))} />
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-givit-ink">Gift style</label>
            <select value={form.style} onChange={(e) => setForm((prev) => ({ ...prev, style: e.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
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
        {messages.length === 1 && savedRecipients.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shop for someone you've saved</p>
            <div className="flex flex-wrap justify-center gap-2">
              {savedRecipients.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => sendMessage(buildRecipientPrompt(r))}
                  title={r.interests?.length ? `Loves ${r.interests.join(", ")}` : undefined}
                  className="flex items-center gap-1.5 rounded-full border border-givit-ember/30 bg-givit-ember/5 px-4 py-2 text-xs font-semibold text-givit-ember transition-colors hover:bg-givit-ember/10"
                >
                  <UserRound className="h-3.5 w-3.5" /> {r.name}{r.relationship ? ` (${r.relationship})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

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
            <p className="text-xs font-semibold text-muted-foreground">Your Gift AI</p>
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
          <div ref={scrollContainerRef} className="flex flex-col gap-5 overflow-y-auto p-5" style={{ maxHeight: "65vh" }}>
            {messages.map((msg) => (
              <div key={msg.id}>
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
                        {msg.results.map((result, idx) => <GiftCard key={result.id} result={result} index={idx} onItemFeedback={handleItemFeedback} />)}
                        <div className="rounded-2xl border border-border/60 bg-card p-3 text-xs text-muted-foreground sm:col-span-2 xl:col-span-3">
                          <div className="mb-2 font-semibold text-givit-ink">Did these feel right?</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleFeedback(msg.results ?? [], true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-100"><ThumbsUp className="h-3.5 w-3.5" /> Satisfied</button>
                            <button type="button" onClick={() => handleFeedback(msg.results ?? [], false)} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-100"><ThumbsDown className="h-3.5 w-3.5" /> Not yet</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* results:[] is truthy, so length===0 alone can't tell "we
                        searched and found nothing" apart from "we haven't
                        searched yet, still asking for more detail" — the
                        latter already has its own message bubble above and
                        showing this too just reads as a broken second reply. */}
                    {msg.results && msg.results.length === 0 && !msg.needsFollowUp && !msg.generalQuestion && (
                      <div className="ml-11 rounded-2xl border border-border/40 bg-givit-sand p-4 text-sm text-muted-foreground">
                        No exact matches found. Try different keywords or <Link href="/products" className="givit-link font-medium">shop the marketplace</Link>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-givit-ember/20" />
    </div>
  );
}
