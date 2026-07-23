/**
 * Thin wrapper around the configured JSON-capable AI provider.
 *
 * Prefer xAI/Grok when `VITE_GROK_API_KEY` or `VITE_XAI_API_KEY` is set.
 * Fall back to Gemini when `VITE_GEMINI_API_KEY` is set. Keys are read from
 * Vite env so they are not hardcoded in source.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type GeminiPart = { text?: string };
type GeminiContent = { parts?: GeminiPart[] };
type GeminiCandidate = { content?: GeminiContent };
type GeminiResponse = { candidates?: GeminiCandidate[] };

type GrokChoice = { message?: { content?: string } };
type GrokResponse = { choices?: GrokChoice[] };

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const DEFAULT_GROK_MODEL = "grok-4.5";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";

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

async function readErrorText(response: Response) {
  return response.text().catch(() => "");
}

async function callGrokJSON(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string },
): Promise<any> {
  const apiKey = (import.meta.env.VITE_GROK_API_KEY ?? import.meta.env.VITE_XAI_API_KEY) as string | undefined;
  if (!apiKey) {
    throw new Error("Grok API key is missing. Set VITE_GROK_API_KEY or VITE_XAI_API_KEY and try again.");
  }

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_GROK_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 700,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await readErrorText(response);
    throw new Error(`Grok API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as GrokResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Grok API response had no content.");

  return JSON.parse(stripCodeFence(content));
}

async function callGeminiProviderJSON(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string },
): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set VITE_GEMINI_API_KEY and try again.");
  }

  const model = opts.model ?? DEFAULT_GEMINI_MODEL;
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
    const errorText = await readErrorText(response);
    throw new Error(`Gemini API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini API response had no content.");

  return JSON.parse(stripCodeFence(content));
}

export async function callGeminiJSON(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  const hasGrokKey = Boolean(import.meta.env.VITE_GROK_API_KEY ?? import.meta.env.VITE_XAI_API_KEY);
  if (hasGrokKey) return callGrokJSON(messages, opts);

  return callGeminiProviderJSON(messages, opts);
}
