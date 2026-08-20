import { callGroqJSON } from "@/lib/ai/groq-client";

export type ExtractedRecipientProfile = {
  interests: string[];
  avoidTerms: string[];
  budgetCents: number | null;
  birthdayDate: string | null;
};

const EMPTY: ExtractedRecipientProfile = { interests: [], avoidTerms: [], budgetCents: null, birthdayDate: null };

function isValidISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

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
    const today = new Date();
    const system =
      "You extract structured gifting preferences from a short description of a person, for a gifting app called GIVIT. " +
      "Only extract what's actually stated or clearly implied — never invent interests, brands, or a budget that wasn't mentioned. " +
      "Interests should be short lowercase tags (2-4 words max each, e.g. \"gardening\", \"cooking\", \"true crime podcasts\"), not full sentences. " +
      "avoidTerms are things to explicitly avoid buying (already owns it, dislikes it, allergic, etc.). " +
      "If a birthday is mentioned as a typed date (numbers like \"3/15\", \"03/15/1990\", \"March 15\", \"15th of March\"), " +
      `parse it to ISO yyyy-mm-dd. Today is ${today.toISOString().slice(0, 10)}. If no year is given, use the next occurrence of that month/day on or after today. ` +
      "Return strict JSON only, matching the requested shape, with no markdown code fences.";

    const user = JSON.stringify({
      description: trimmed,
      responseShape: {
        interests: "string[], short tags only, empty array if none clearly stated",
        avoidTerms: "string[], things to avoid, empty array if none stated",
        budgetUsd: "number or null, only if a specific budget/price range was actually mentioned",
        birthdayDate: "string yyyy-mm-dd or null, only if a birthday date was actually stated",
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
      birthdayDate: isValidISODate(ai?.birthdayDate) ? ai.birthdayDate : null,
    };
  } catch (error) {
    // Fails soft (blank fields, user can still fill the form manually), but
    // silently swallowing every error made it impossible to tell "Groq is
    // down/misconfigured" from "there was nothing to extract" — log it so a
    // bad or missing server-side GROQ_API_KEY (see api/groq.ts) is visible
    // in the browser console.
    console.warn("GIVIT AI: recipient extraction failed, falling back to manual entry.", error);
    return EMPTY;
  }
}
