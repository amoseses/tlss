import { callOpenAIJSON } from "./openai.mjs";

// Never invent products: the model can only select/reorder/reword the exact
// candidates it's given, matched back by "id". This keeps checkout links,
// prices, and images trustworthy even though the copy and ranking are AI-generated.

export async function handleAutogiftSuggestions(body) {
  const { survey, recipientName, occasion, candidates } = body ?? {};
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("candidates array is required");
  }

  const system =
    "You are Givit's gifting concierge AI. You NEVER invent products — you only select from the exact candidate list given to you, referencing them by \"id\". Write short, warm, specific copy. No generic filler like \"a thoughtful gift for any occasion\". " +
    "Treat the recipient as a specific individual, not a category: two people with the same relationship label (e.g. two 'moms') can want completely different things. Weight their stated interests, notes, and gift style more heavily than generic assumptions tied to the relationship or occasion alone — if their notes mention something specific, that should visibly shape your picks and reasons, not just the relationship label. Return strict JSON only, matching the requested shape exactly.";

  const user = JSON.stringify({
    instructions:
      "Select the best 4-6 candidates for this recipient and occasion given the survey answers — prioritize candidates that match their specific stated interests and notes over generic relationship/occasion defaults. For each selected candidate, write a personalized 1-2 sentence reason that references something specific about this person (not a generic reason that could apply to anyone with the same relationship label), and a 0-100 match rating. Also draft one short handwritten card message (2-3 sentences, warm and specific to the details given, no generic filler) fitting the occasion and gift style.",
    recipientName: recipientName ?? null,
    occasion: occasion ?? null,
    survey,
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, category: c.category, price: c.price })),
    responseShape: {
      suggestions: [{ id: "must match a candidate id exactly", reason: "string", rating: "number 0-100" }],
      cardMessage: "string",
    },
  });

  const result = await callOpenAIJSON(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.8, maxTokens: 900 },
  );

  const candidateIds = new Set(candidates.map((c) => c.id));
  const suggestions = Array.isArray(result?.suggestions)
    ? result.suggestions.filter((s) => s && typeof s.id === "string" && candidateIds.has(s.id)).slice(0, 6)
    : [];

  return {
    suggestions: suggestions.map((s) => ({
      id: s.id,
      reason: typeof s.reason === "string" ? s.reason.slice(0, 400) : undefined,
      rating: typeof s.rating === "number" ? Math.max(0, Math.min(100, Math.round(s.rating))) : undefined,
    })),
    cardMessage: typeof result?.cardMessage === "string" ? result.cardMessage.slice(0, 600) : null,
  };
}

export async function handleGiftChat(body) {
  const { query, candidates } = body ?? {};
  if (typeof query !== "string" || !query.trim()) throw new Error("query is required");
  if (!Array.isArray(candidates)) throw new Error("candidates array is required");

  const system =
    "You are Givit AI, a warm and concise gifting concierge chatting with a shopper. You NEVER invent products — only select from the exact candidate list by \"id\". Keep the chat reply to 1-2 sentences. " +
    "Read the shopper's message for the actual person behind it — specific interests, quirks, or context they mention should drive your picks more than generic assumptions about their relationship to the recipient (e.g. don't default to the same handful of \"mom\" or \"dad\" gifts; use what they actually told you). Return strict JSON only, matching the requested shape exactly.";

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

  const result = await callOpenAIJSON(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.7, maxTokens: 600 },
  );

  const candidateIds = new Set(candidates.map((c) => c.id));
  const picks = Array.isArray(result?.picks)
    ? result.picks.filter((p) => p && typeof p.id === "string" && candidateIds.has(p.id)).slice(0, 5)
    : [];

  return {
    message: typeof result?.message === "string" ? result.message.slice(0, 500) : null,
    picks: picks.map((p) => ({ id: p.id, reason: typeof p.reason === "string" ? p.reason.slice(0, 300) : undefined })),
  };
}
