/**
 * Thin wrapper around Puter.js (js.puter.com), loaded via a <script> tag in
 * index.html — it's a client-side-only SDK with no server-side API key.
 * Authentication is handled silently without user-facing popups.
 *
 * Puter.ai.chat() has no native structured/JSON-output mode (unlike the
 * OpenAI/Gemini APIs this replaced), so JSON is enforced by prompting for
 * it and defensively parsing the reply.
 */

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
          options?: { model?: string; temperature?: number; max_tokens?: number },
        ) => Promise<{ message?: { content?: string } }>;
      };
      auth: {
        isSignedIn: () => boolean;
      };
    };
  }
}

const DEFAULT_MODEL = "google/gemini-2.5-flash";

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export async function callPuterJSON(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter.js hasn't loaded yet — check your connection and try again.");
  }

  // Puter has no JSON response_format, so the instruction has to travel in
  // the system prompt itself, and every caller's system prompt already
  // ends with "Return strict JSON only" (see gift-ai.ts / imported-products.ts).
  const response = await window.puter.ai.chat(messages, {
    model: opts.model ?? DEFAULT_MODEL,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 700,
  });

  const content = response?.message?.content;
  if (!content) throw new Error("Puter AI response had no content.");
  return JSON.parse(stripCodeFence(content));
}
