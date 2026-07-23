import { callGroqJSON } from "@/lib/ai/groq-client";

export type ExtractedRecipientProfile = {
  interests: string[];
  avoidTerms: string[];
  budgetCents: number | null;
};

const EMPTY: ExtractedRecipientProfile = { interests: [], avoidTerms: [], budgetCents: null };

/**
 * Turns a free-text description ("My mom loves gardening, homemade food,
 * and traveling. She already has lots of kitchen gadgets.") into structured
 * profile fields, so adding a person is one sentence instead of a long
 * form. This is the "30 seconds, done forever" step — everything it can't
 * confidently extract is just left blank rather than guessed.
 */
export async function extractRecipientProfile(text: string): Promise<ExtractedRecipientProfile> {
  const trimmed = text.trim();
  if (!trimmed) return EMPTY;

  try {
    const system =
      "You extract structured gifting preferences from a short description of a person, for a gifting app called GIVIT. " +
      "Only extract what's actually stated or clearly implied — never invent interests, brands, or a budget that wasn't mentioned. " +
      "Interests should be short lowercase tags (2-4 words max each, e.g. \"gardening\", \"cooking\", \"true crime podcasts\"), not full sentences. " +
      "avoidTerms are things to explicitly avoid buying (already owns it, dislikes it, allergic, etc.). " +
      "Return strict JSON only, matching the requested shape, with no markdown code fences.";

    const user = JSON.stringify({
      description: trimmed,
      responseShape: {
        interests: "string[], short tags only, empty array if none clearly stated",
        avoidTerms: "string[], things to avoid, empty array if none stated",
        budgetUsd: "number or null, only if a specific budget/price range was actually mentioned",
      },
    });

    const ai = await callGroqJSON(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.2, maxTokens: 300 },
    );

    return {
      interests: Array.isArray(ai?.interests) ? ai.interests.filter((i: unknown) => typeof i === "string").slice(0, 10) : [],
      avoidTerms: Array.isArray(ai?.avoidTerms) ? ai.avoidTerms.filter((i: unknown) => typeof i === "string").slice(0, 10) : [],
      budgetCents: typeof ai?.budgetUsd === "number" && ai.budgetUsd > 0 ? Math.round(ai.budgetUsd * 100) : null,
    };
  } catch (error) {
    // Fails soft (blank fields, user can still fill the form manually), but
    // silently swallowing every error made it impossible to tell "Groq is
    // down/misconfigured" from "there was nothing to extract" — log it so a
    // bad or missing VITE_GROQ_API_KEY is visible in the browser console.
    console.warn("GIVIT AI: recipient extraction failed, falling back to manual entry.", error);
    return EMPTY;
  }
}
