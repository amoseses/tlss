/**
 * Thin wrapper around the Gemini generateContent REST API.
 *
 * The API key is read from Vite env (`VITE_GEMINI_API_KEY`) so it is not
 * hardcoded in source.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

const DEFAULT_MODEL = "gemini-flash-latest";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function toGeminiPrompt(messages: ChatMessage[]) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

export async function callGeminiJSON(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set VITE_GEMINI_API_KEY and try again.");
  }

  const model = opts.model ?? DEFAULT_MODEL;
  const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: toGeminiPrompt(messages) }],
        },
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 700,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini API response had no content.");

  return JSON.parse(stripCodeFence(content));
}
