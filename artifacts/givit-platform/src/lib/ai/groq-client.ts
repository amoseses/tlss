/**
 * Thin wrapper around Groq's OpenAI-compatible chat completions API.
 *
 * The API key is read from Vite env (`VITE_GROQ_API_KEY`) so it is not
 * hardcoded in source. Groq's free tier is what's actually driving Givit
 * AI now — Gemini required billing to use at any real volume.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export async function callGroqJSON(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Groq API key is missing. Set VITE_GROQ_API_KEY and try again.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 700,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Groq API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Groq API response had no content.");

  return JSON.parse(stripCodeFence(content));
}
