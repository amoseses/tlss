import type { GiftRecommendResponse, GiftRecommendResult } from "@/lib/gift-recommend";
import { personalizeGiftChat } from "@/lib/ai/gift-ai";

/**
 * Re-ranks and rewrites match reasons for an already-computed local result
 * using the AI, matched back to the same product ids. Falls back to the
 * untouched local result if the AI call fails or times out.
 *
 * `base` provides the display-facing message/result-count context (e.g. a
 * normal 5-result call so "here are 5 ideas" stays accurate); `candidatePool`
 * is the (optionally wider) set of products the AI is allowed to choose
 * from, which may include items outside `base.results` so the AI can
 * surface something the plain scorer under-ranked, not just reword the
 * same shortlist. Defaults to `base.results` if not given.
 */
export async function personalizeChatResponse(
  query: string,
  base: GiftRecommendResponse,
  candidatePool: GiftRecommendResult[] = base.results ?? [],
): Promise<GiftRecommendResponse> {
  if (!candidatePool || candidatePool.length === 0) return base;

  const candidates = candidatePool.map((r) => ({
    id: r.id,
    name: r.name,
    price_cents: r.price_cents,
    gift_tags: r.gift_tags,
    description: r.description,
  }));

  const ai = await personalizeGiftChat({ query, candidates });
  if (!ai) return base;

  const reasonById = new Map(ai.picks.map((p) => [p.id, p.reason]));
  const order = ai.picks.map((p) => p.id);
  const byId = new Map(candidatePool.map((r) => [r.id, r]));
  const reordered = order.map((id) => byId.get(id)).filter((r): r is GiftRecommendResult => Boolean(r));
  const remaining = candidatePool.filter((r) => !order.includes(r.id));

  // The AI chose from the full (wider-than-display) candidate pool passed
  // in, so cap back down to a normal result-list length here.
  const results = [...reordered, ...remaining].slice(0, 5).map((r) => ({
    ...r,
    match_reason: reasonById.get(r.id) ?? r.match_reason,
  }));

  return {
    ...base,
    message: ai.message ?? base.message,
    results,
  };
}
