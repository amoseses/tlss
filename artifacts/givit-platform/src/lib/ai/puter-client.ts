/**
 * Thin wrapper around Puter.js (js.puter.com), loaded via a <script> tag in
 * index.html — it's a client-side-only SDK with no server-side API key.
 * Authentication is handled silently via a hidden iframe to avoid popup interruption.
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

/**
 * Initialize Puter authentication silently via hidden iframe.
 * This prevents the login popup from appearing on first use.
 */
async function ensurePuterAuth(): Promise<void> {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter.js hasn't loaded yet — check your connection and try again.");
  }

  // If already signed in, no need to do anything
  if (window.puter.auth.isSignedIn()) {
    return;
  }

  // Silently authenticate using a hidden iframe without blocking the UI
  try {
    const iframeId = "puter-auth-iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;

    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.src = `https://puter.com/?embedded_in_popup=true&msg_id=${Date.now()}`;
      iframe.style.display = "none";
      iframe.style.position = "absolute";
      iframe.style.visibility = "hidden";
      iframe.style.width = "0";
      iframe.style.height = "0";
      document.body.appendChild(iframe);
    }

    // Wait a short moment for Puter to process auth
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch {
    // Silently fail — AI functionality will still work, just with potential rate limiting
    console.debug("Puter silent auth iframe setup encountered an issue, continuing anyway");
  }
}

export async function callPuterJSON(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter.js hasn't loaded yet — check your connection and try again.");
  }

  // Ensure auth is set up silently
  await ensurePuterAuth();

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
