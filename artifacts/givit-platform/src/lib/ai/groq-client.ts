type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function stripCodeFence(text: string) {
  const trimmed = text.trim();

  const fenced = trimmed.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  );

  return fenced ? fenced[1] : trimmed;
}

export async function callGroqJSON(
  messages: ChatMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<any> {

  const response = await fetch("/api/groq", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 700,
      model: opts.model,
    }),
  });

  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => "");

    throw new Error(
      `Groq API request failed (${response.status}): ${
        errorText || response.statusText
      }`
    );
  }

  const data = await response.json();

  const content =
    data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(
      "Groq API response had no content."
    );
  }

  return JSON.parse(
    stripCodeFence(content)
  );
}