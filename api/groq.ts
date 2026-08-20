// No other function in this directory imports @vercel/node -- it isn't a
// project dependency, so that import failed to resolve at build time.
// Plain `any` request/response params match the pattern used everywhere
// else in api/.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY is not configured",
      });
    }

    const {
      messages,
      temperature = 0.7,
      maxTokens = 700,
      model = DEFAULT_MODEL,
    } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array",
      });
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: {
          type: "json_object",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data,
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Groq API error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}