import type { GiftRecommendResponse, GiftRecommendResult } from "@/lib/gift-recommend";
import { personalizeGiftChat } from "@/lib/ai/gift-ai";

/**
 * Re-ranks and rewrites match reasons for an already-computed local result
 * using the AI, matched back to the same product ids. Falls back to the
 * untouched local result if the AI call fails or times out.
 */
export async function personalizeChatResponse(query: string, base: GiftRecommendResponse): Promise<GiftRecommendResponse> {
  if (!base.results || base.results.length === 0) return base;

  const candidates = base.results.map((r) => ({
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
  const byId = new Map(base.results.map((r) => [r.id, r]));
  const reordered = order.map((id) => byId.get(id)).filter((r): r is GiftRecommendResult => Boolean(r));
  const remaining = base.results.filter((r) => !order.includes(r.id));

  const results = [...reordered, ...remaining].map((r) => ({
    ...r,
    match_reason: reasonById.get(r.id) ?? r.match_reason,
  }));

  return {
    ...base,
    message: ai.message ?? base.message,
    results,
  };
}
