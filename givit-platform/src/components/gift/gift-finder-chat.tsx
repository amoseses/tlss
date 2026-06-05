"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, ShoppingCart, Star, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type GiftResult = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  description: string | null;
  image_url: string | null;
  avg_rating: number | null;
  review_count: number;
  match_reason: string;
  gift_tags: string[];
  rank_label?: string;
  learning_tags?: string[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
  results?: GiftResult[];
  loading?: boolean;
};

const GREETING: Message = {
  role: "assistant",
  content: "👋 Hi! I'm GIVIT AI. Answer the gift questionnaire in one message — who it's for, the occasion, budget, interests, style, and anything to avoid — and I'll rank marketplace gifts for you. Then tell me if the picks worked so I can adapt.",
};

const QUICK_PROMPTS = [
  { label: "For Mom 🌸", prompt: "Gift for my mom who loves cooking and gardening, birthday, $50 budget" },
  { label: "For Dad 🔧", prompt: "Birthday gift for my dad who likes tools and outdoors, under $75" },
  { label: "For Friend 🎉", prompt: "Fun gift for a close friend, any occasion, $30-$50" },
  { label: "For Partner 💝", prompt: "Romantic anniversary gift for my partner, $100 budget" },
  { label: "For Kids 🧸", prompt: "Gift for a 7 year old who loves art and crafts, $25 budget" },
  { label: "Pens ✍️", prompt: "Questionnaire: gift for a teacher who loves pens and journaling, thank-you gift, under $30, avoid anything too bulky" },
];

type LearningProfile = {
  productWeights: Record<string, number>;
  tagWeights: Record<string, number>;
};

const LEARNING_KEY = "givit-ai-learning-profile";

function readLearningProfile(): LearningProfile {
  if (typeof window === "undefined") return { productWeights: {}, tagWeights: {} };
  try {
    const raw = window.localStorage.getItem(LEARNING_KEY);
    if (!raw) return { productWeights: {}, tagWeights: {} };
    const parsed = JSON.parse(raw) as Partial<LearningProfile>;
    return {
      productWeights: parsed.productWeights ?? {},
      tagWeights: parsed.tagWeights ?? {},
    };
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-givit-ember">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai flex items-center gap-1.5">
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}

function GiftCard({ result, index }: { result: GiftResult; index: number }) {
  return (
    <div
      className="slide-up givit-panel overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div className="relative aspect-[4/3] bg-givit-sand overflow-hidden">
        {result.image_url ? (
          <Image
            src={result.image_url}
            alt={result.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🎁</span>
          </div>
        )}
        {result.rank_label ? (
          <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-givit-ember shadow-sm">
            {result.rank_label}
          </div>
        ) : null}
        {/* Match reason badge */}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm line-clamp-1">
            ✨ {result.match_reason}
          </p>
        </div>
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
          {result.name}
        </p>

        {result.avg_rating && result.review_count > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              {Number(result.avg_rating).toFixed(1)} ({result.review_count})
            </span>
          </div>
        )}

        {result.gift_tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {result.gift_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-givit-sand px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-bold text-givit-ember">
            {formatMoney(result.price_cents)}
          </p>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/products/${result.slug}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/products/${result.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-givit-ember px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-givit-ember-hover"
            >
              <ShoppingCart className="h-3 w-3" />
              Add
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GiftFinderChat() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const loadingMsg: Message = { role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/gift-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, learningProfile: readLearningProfile() }),
      });

      const data = await res.json();

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        const aiMsg: Message = {
          role: "assistant",
          content: data.message || `I found ${data.results?.length ?? 0} great gift options for you! Here are my top picks:`,
          results: data.results || [],
        };
        return [...withoutLoading, aiMsg];
      });
    } catch {
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        return [...withoutLoading, {
          role: "assistant",
          content: "Sorry, I ran into an issue finding gifts. Please try again!",
        }];
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleFeedback(results: GiftResult[], satisfied: boolean) {
    applyFeedback(results, satisfied);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: satisfied
          ? "Great — I saved those positive signals. Future rankings will lean toward gifts like these. ✅"
          : "Got it — I saved that these were not quite right. Tell me what to change, and I will rerank away from these patterns.",
      },
    ]);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Quick prompts (only shown before any user message) */}
      {messages.length === 1 && (
        <div className="mb-4 flex flex-wrap gap-2 justify-center">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => sendMessage(qp.prompt)}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-givit-ember/40 hover:bg-givit-sand hover:text-givit-ember"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div className="givit-panel flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex flex-col gap-5 overflow-y-auto p-5" style={{ maxHeight: "60vh" }}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="chat-bubble-user max-w-[80%] text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : msg.loading ? (
                <TypingIndicator />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-givit-ember">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    {msg.content && (
                      <div className="chat-bubble-ai max-w-[85%] text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    )}
                  </div>

                  {/* Gift results grid */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="ml-11 grid grid-cols-2 gap-3 sm:grid-cols-3 stagger-children">
                      {msg.results.map((result, idx) => (
                        <GiftCard key={result.id} result={result} index={idx} />
                      ))}
                      <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 text-xs text-muted-foreground sm:col-span-3">
                        <span className="font-semibold text-givit-ink">Did these feel right?</span>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.results ?? [], true)}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> Satisfied
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.results ?? [], false)}
                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" /> Not yet
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.results && msg.results.length === 0 && (
                    <div className="ml-11 rounded-2xl bg-givit-sand border border-border/40 p-4 text-sm text-muted-foreground">
                      No exact matches found. Try different keywords, a different budget, or{" "}
                      <Link href="/products" className="givit-link font-medium">browse all products</Link>.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Questionnaire: for my sister, birthday, loves pens and art, under $40, avoid tech..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-givit-ember text-white transition-all hover:bg-givit-ember-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Questionnaire tip: recipient + occasion + budget + interests + avoid list · Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
