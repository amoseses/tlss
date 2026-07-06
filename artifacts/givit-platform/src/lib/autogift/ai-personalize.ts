import type { AutoGiftBundle, GiftSuggestion, SurveyResponse } from "./survey";
import { personalizeAutogiftSuggestions } from "@/lib/ai/gift-ai";

/**
 * Sends the already-generated (deterministic) bundle items to the AI as
 * candidates, and merges back only "reason" and "rating" by id — the AI can
 * re-rank and rewrite copy, but never introduce a product that isn't already
 * in the candidate list, so checkout links/prices/images stay trustworthy.
 */
export async function personalizeBundlesWithAI(
  response: SurveyResponse,
  bundles: AutoGiftBundle[],
  recipientName: string,
  occasion: string,
): Promise<{ bundles: AutoGiftBundle[]; cardMessage: string | null }> {
  const candidateMap = new Map<string, GiftSuggestion>();
  for (const bundle of bundles) {
    for (const item of bundle.items) candidateMap.set(item.id, item);
  }
  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) return { bundles, cardMessage: null };

  const ai = await personalizeAutogiftSuggestions({
    survey: response,
    recipientName,
    occasion,
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, category: c.category, price: c.price })),
  });
  if (!ai) return { bundles, cardMessage: null };

  const deltas = new Map(ai.suggestions.map((s) => [s.id, s]));
  const nextBundles = bundles.map((bundle) => ({
    ...bundle,
    items: bundle.items.map((item) => {
      const delta = deltas.get(item.id);
      if (!delta) return item;
      return {
        ...item,
        reason: delta.reason ?? item.reason,
        rating: delta.rating ?? item.rating,
      };
    }),
  }));

  return { bundles: nextBundles, cardMessage: ai.cardMessage };
}
