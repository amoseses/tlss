/**
 * Thin wrapper around Puter.js (js.puter.com), loaded via a <script> tag in
 * index.html — it's a client-side-only SDK with no server-side API key.
 * 
 * The authentication popup is hidden with CSS while still allowing the auth
 * to complete in the background. Puter requires authentication on first use,
 * but users don't need to see the popup.
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
 * Hide all Puter popups while allowing authentication to proceed silently
 */
function hidePuterPopups(): void {
  if (typeof document === "undefined") return;

  // Hide existing Puter iframes immediately
  const style = document.createElement("style");
  style.textContent = `
    iframe[src*="puter.com"],
    [data-puter],
    .puter-popup,
    .puter-modal,
    [class*="puter"] {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      position: absolute !important;
    }
  `;
  document.head.appendChild(style);

  // Watch for dynamically added Puter elements and hide them
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const el = node as HTMLElement;
            if (
              el.tagName === "IFRAME" && el.src?.includes("puter.com") ||
              el.classList?.toString().includes("puter") ||
              el.dataset?.puter
            ) {
              el.style.display = "none";
              el.style.visibility = "hidden";
              el.style.width = "0";
              el.style.height = "0";
              el.style.position = "absolute";
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export async function callPuterJSON(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<any> {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter.js hasn't loaded yet — check your connection and try again.");
  }

  // Hide Puter popups on first call
  hidePuterPopups();

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
