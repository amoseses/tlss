/**
 * Client-side AI personalization via Groq (see groq-client.ts). Always
 * fails soft (returns null) so callers can fall back to the deterministic
 * local matching if Groq is unavailable, the API key is missing, or
 * the call errors/times out.
 *
 * Never invent products: the model can only select/reorder/reword the exact
 * candidates it's given, matched back by "id". This keeps checkout links,
 * prices, and images trustworthy even though the copy and ranking are
 * AI-generated.
 */

import { callGroqJSON } from "./groq-client";

export type AutogiftAISuggestion = { id: string; reason?: string; rating?: number };
export type AutogiftAIResult = {
  suggestions: AutogiftAISuggestion[];
  cardMessage: string | null;
};

export async function personalizeAutogiftSuggestions(
  params: { survey: unknown; recipientName?: string; occasion?: string; candidates: Array<{ id: string; name: string; category?: string; price?: number }> },
  timeoutMs = 9000,
): Promise<AutogiftAIResult | null> {
  const { survey, recipientName, occasion, candidates } = params;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const system =
    "You are GIVIT's gifting concierge AI. You NEVER invent products — you only select from the exact candidate list given to you, referencing them by \"id\". Write short, warm, specific copy. No generic filler like \"a thoughtful gift for any occasion\". " +
    "Treat the recipient as a specific individual, not a category: two people with the same relationship label (e.g. two 'moms') can want completely different things. Weight their stated interests, personality traits, past gift reactions, notes, and gift style more heavily than generic assumptions tied to the relationship or occasion alone — if their notes mention something specific, that should visibly shape your picks and reasons, not just the relationship label. The survey's personality field (their tone/traits) and pastGiftFeedback field (what they've loved or been lukewarm on before) are deliberate, structured signal — always factor them in when present, not just free-text notes: favor picks consistent with their personality traits, lean into whatever pattern pastGiftFeedback.loved suggests, and actively avoid repeating whatever pastGiftFeedback.missed describes. Return strict JSON only, matching the requested shape exactly, with no markdown code fences.";

  const user = JSON.stringify({
    instructions:
      "Select the best 4-6 candidates for this recipient and occasion given the survey answers — prioritize candidates that match their specific stated interests, personality, and past gift reactions over generic relationship/occasion defaults. For each selected candidate, write a personalized 1-2 sentence reason that references something specific about this person (not a generic reason that could apply to anyone with the same relationship label) — when a pick connects to their personality or a past gift reaction, say so explicitly — and a 0-100 match rating. Also draft one short handwritten card message (2-3 sentences, warm and specific to the details given, no generic filler) fitting the occasion and gift style.",
    recipientName: recipientName ?? null,
    occasion: occasion ?? null,
    survey,
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, category: c.category, price: c.price })),
    responseShape: {
      suggestions: [{ id: "must match a candidate id exactly", reason: "string", rating: "number 0-100" }],
      cardMessage: "string",
    },
  });

  try {
    const result = await Promise.race([
      callGroqJSON(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.8, maxTokens: 900 },
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq API request timed out")), timeoutMs)),
    ]);

    const candidateIds = new Set(candidates.map((c) => c.id));
    const suggestions = Array.isArray(result?.suggestions)
      ? result.suggestions.filter((s: any) => s && typeof s.id === "string" && candidateIds.has(s.id)).slice(0, 6)
      : [];

    return {
      suggestions: suggestions.map((s: any) => ({
        id: s.id,
        reason: typeof s.reason === "string" ? s.reason.slice(0, 400) : undefined,
        rating: typeof s.rating === "number" ? Math.max(0, Math.min(100, Math.round(s.rating))) : undefined,
      })),
      cardMessage: typeof result?.cardMessage === "string" ? result.cardMessage.slice(0, 600) : null,
    };
  } catch (error) {
    console.warn("Your Gift AI: AutoGift personalization failed, falling back to deterministic ranking.", error);
    return null;
  }
}

export type GiftChatAIPick = { id: string; reason?: string };
export type GiftChatAIResult = { message: string | null; picks: GiftChatAIPick[] };

export async function personalizeGiftChat(
  params: { query: string; candidates: Array<{ id: string; name: string; price_cents?: number; gift_tags?: string[]; description?: string | null }> },
  timeoutMs = 7000,
): Promise<GiftChatAIResult | null> {
  const { query, candidates } = params;
  if (typeof query !== "string" || !query.trim() || !Array.isArray(candidates)) return null;

  const system =
    "You are Your Gift AI, a warm and concise gifting concierge chatting with a shopper. You NEVER invent products — only select from the exact candidate list by \"id\". Keep the chat reply to 1-2 sentences. " +
    "Read the shopper's message for the actual person behind it — specific interests, quirks, or context they mention should drive your picks more than generic assumptions about their relationship to the recipient (e.g. don't default to the same handful of \"mom\" or \"dad\" gifts; use what they actually told you). Return strict JSON only, matching the requested shape exactly, with no markdown code fences.";

  const user = JSON.stringify({
    instructions:
      "Pick up to 5 of the best-fit candidates for this shopper's message, ordered best first, favoring ones that match specific details they mentioned over generic relationship defaults. Write one short, specific reason per pick that references something concrete from their message (not a reason that could apply to any recipient with the same label) and a short conversational reply.",
    shopperMessage: query,
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, price_cents: c.price_cents, tags: c.gift_tags, description: c.description })),
    responseShape: {
      message: "string",
      picks: [{ id: "must match a candidate id exactly", reason: "string" }],
    },
  });

  try {
    const result = await Promise.race([
      callGroqJSON(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.7, maxTokens: 600 },
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq API request timed out")), timeoutMs)),
    ]);

    const candidateIds = new Set(candidates.map((c) => c.id));
    const picks = Array.isArray(result?.picks)
      ? result.picks.filter((p: any) => p && typeof p.id === "string" && candidateIds.has(p.id)).slice(0, 5)
      : [];

    return {
      message: typeof result?.message === "string" ? result.message.slice(0, 500) : null,
      picks: picks.map((p: any) => ({ id: p.id, reason: typeof p.reason === "string" ? p.reason.slice(0, 300) : undefined })),
    };
  } catch (error) {
    console.warn("Your Gift AI: chat personalization failed, falling back to deterministic ranking.", error);
    return null;
  }
}

/**
 * Handles the "not enough info yet" turns — the deterministic layer decides
 * *whether* more detail is needed (it's the source of truth on missing
 * fields), but the actual reply used to always be one of ~5 fixed strings
 * ("Got it! Who's the gift for, and what's the occasion?"), so the chat felt
 * scripted the moment it wasn't showing product cards. This asks Groq to
 * write that same request for more detail as an actual reply to what the
 * shopper just said, so it reads as conversation instead of a form.
 */
export async function personalizeFollowUp(
  params: {
    query: string;
    missing: string[];
    known: { recipient: string | null; occasion: string | null; budget: number | null; interests: string[] };
  },
  timeoutMs = 6000,
): Promise<string | null> {
  const { query, missing, known } = params;
  if (typeof query !== "string" || !query.trim() || missing.length === 0) return null;

  const system =
    "You are Your Gift AI, a warm and concise gifting concierge chatting with a shopper. You don't have enough detail yet to recommend real products. " +
    "Write ONE short, natural reply (max 2 sentences) that asks for whatever's still missing, in a way that directly responds to what the shopper just said — reference something specific from their message if there's anything to react to, don't just restate a form field. Never recommend or mention any specific product. Return strict JSON only, matching the requested shape exactly, with no markdown code fences.";

  const user = JSON.stringify({
    instructions: "Ask for the missing information conversationally, prioritizing whichever missing field would unblock a recommendation fastest.",
    shopperMessage: query,
    alreadyKnown: known,
    stillMissing: missing,
    responseShape: { reply: "string" },
  });

  try {
    const result = await Promise.race([
      callGroqJSON(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.8, maxTokens: 200 },
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq API request timed out")), timeoutMs)),
    ]);

    return typeof result?.reply === "string" && result.reply.trim() ? result.reply.trim().slice(0, 300) : null;
  } catch (error) {
    console.warn("Your Gift AI: conversational follow-up failed, falling back to canned prompt.", error);
    return null;
  }
}

export type CompareAIResult = { winner: "a" | "b" | "tie"; reasoning: string };

export async function compareGiftsForRecipient(
  params: {
    query: string;
    recipientName?: string | null;
    interests?: string[];
    a: { id: string; name: string; price_cents?: number; gift_tags?: string[]; description?: string | null };
    b: { id: string; name: string; price_cents?: number; gift_tags?: string[]; description?: string | null };
  },
  timeoutMs = 7000,
): Promise<CompareAIResult | null> {
  const { query, recipientName, interests, a, b } = params;

  const system =
    "You are Your Gift AI, a gifting concierge asked to settle a head-to-head between exactly two candidate gifts. You NEVER invent products or details beyond what's given. " +
    "If a recipient and their interests are known, weigh the two candidates specifically against that person, not generic specs — reference what's actually known about them in your reasoning. If nothing is known about the recipient, compare on overall gift quality, uniqueness, and value instead, and say so honestly rather than inventing a personal angle. Pick a clear winner unless they're genuinely close, in which case say \"tie\" and explain the real tradeoff. Keep the reasoning to 1-2 sentences. Return strict JSON only, matching the requested shape exactly, with no markdown code fences.";

  const user = JSON.stringify({
    instructions: "Decide which candidate (\"a\" or \"b\") is the better gift, or \"tie\" if genuinely close, and explain why in 1-2 sentences.",
    shopperMessage: query,
    recipientName: recipientName ?? null,
    recipientInterests: interests ?? [],
    candidateA: { name: a.name, price_cents: a.price_cents, tags: a.gift_tags, description: a.description },
    candidateB: { name: b.name, price_cents: b.price_cents, tags: b.gift_tags, description: b.description },
    responseShape: { winner: "\"a\" | \"b\" | \"tie\"", reasoning: "string" },
  });

  try {
    const result = await Promise.race([
      callGroqJSON(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.5, maxTokens: 300 },
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq API request timed out")), timeoutMs)),
    ]);

    const winner = result?.winner === "a" || result?.winner === "b" || result?.winner === "tie" ? result.winner : null;
    if (!winner || typeof result?.reasoning !== "string" || !result.reasoning.trim()) return null;

    return { winner, reasoning: result.reasoning.trim().slice(0, 400) };
  } catch (error) {
    console.warn("Your Gift AI: compare failed, falling back to deterministic comparison.", error);
    return null;
  }
}

/**
 * Answers a question that has nothing to do with gift-shopping (e.g. "who
 * won the 2026 World Cup"). GIVIT AI shouldn't just refuse everything
 * off-topic — a shopper chatting with it expects it to behave like a normal
 * helpful assistant, not a form that only understands recipient/occasion/
 * budget. Falls back to an honest "not sure" reply on failure rather than
 * ever inventing an answer with no model behind it.
 */
export async function answerGeneralQuestion(query: string, timeoutMs = 7000): Promise<string | null> {
  if (typeof query !== "string" || !query.trim()) return null;

  const system =
    "You are Your Gift AI, a friendly gifting concierge who can also just chat and answer everyday questions like any helpful assistant. " +
    "Answer the user's question directly and honestly in 1-3 sentences. If you genuinely don't know or the question is about something after your knowledge cutoff (a future or very recent event), say so plainly instead of guessing at an answer. " +
    "Only if it fits naturally, you may add one brief closing sentence inviting them back to gift shopping — never force it, and never turn the answer itself into a gift pitch. Return strict JSON only, matching the requested shape exactly, with no markdown code fences.";

  const user = JSON.stringify({
    instructions: "Answer this question conversationally and honestly.",
    question: query,
    responseShape: { answer: "string" },
  });

  try {
    const result = await Promise.race([
      callGroqJSON(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.4, maxTokens: 300 },
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Groq API request timed out")), timeoutMs)),
    ]);

    return typeof result?.answer === "string" && result.answer.trim() ? result.answer.trim().slice(0, 600) : null;
  } catch (error) {
    console.warn("Your Gift AI: general question answer failed.", error);
    return null;
  }
}
