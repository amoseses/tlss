/**
 * Client for the /api/ai/* endpoints. Always fails soft (returns null) so
 * callers can fall back to the deterministic local matching if the AI is
 * unavailable, misconfigured, or slow.
 */

export type AutogiftAISuggestion = { id: string; reason?: string; rating?: number };
export type AutogiftAIResult = {
  suggestions: AutogiftAISuggestion[];
  cardMessage: string | null;
};

export async function personalizeAutogiftSuggestions(
  params: { survey: unknown; recipientName?: string; occasion?: string; candidates: Array<{ id: string; name: string; category?: string; price?: number }> },
  timeoutMs = 9000,
): Promise<AutogiftAIResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/ai/autogift-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AutogiftAIResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type GiftChatAIPick = { id: string; reason?: string };
export type GiftChatAIResult = { message: string | null; picks: GiftChatAIPick[] };

export async function personalizeGiftChat(
  params: { query: string; candidates: Array<{ id: string; name: string; price_cents?: number; gift_tags?: string[]; description?: string | null }> },
  timeoutMs = 7000,
): Promise<GiftChatAIResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/ai/gift-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as GiftChatAIResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
