// Google Gemini equivalent of the old openai.mjs helper — same call shape
// (array of {role, content} messages in, parsed JSON object out) so
// handlers.mjs / extract-product.mjs didn't need to change beyond the
// import. Uses Gemini's structured-output mode (responseMimeType:
// "application/json") instead of prompting for JSON and hoping.
function toGeminiContents(messages) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => ({ text: m.content }));
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  return { systemParts, contents };
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export async function callGeminiJSON(messages, opts = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const { systemParts, contents } = toGeminiContents(messages);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        ...(systemParts.length ? { systemInstruction: { parts: systemParts } } : {}),
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 700,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!content) {
      const blockReason = data.promptFeedback?.blockReason || candidate?.finishReason;
      throw new Error(`Gemini response had no content${blockReason ? ` (${blockReason})` : ""}.`);
    }
    return JSON.parse(stripCodeFence(content));
  } finally {
    clearTimeout(timeout);
  }
}
