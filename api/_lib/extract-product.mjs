import { callGeminiJSON } from "./gemini.mjs";

const CATEGORIES = ["tech", "kitchen", "writing", "beauty", "fitness", "outdoor", "pets", "art", "experiences", "home", "gaming"];

async function fetchPageMetadata(pageUrl) {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Turns a bare product/experience URL into a clean marketplace-ready record
 * using real page metadata (title, description, publisher) plus an LLM pass
 * to normalize it — replaces the old regex-only guessing (guessCategory,
 * guessBrand, extractNameFromUrl) which produced generic/fake-looking
 * results (e.g. price = a hash of the name length).
 */
export async function extractProductWithAI(url) {
  const meta = await fetchPageMetadata(url);

  const system =
    `You turn a raw product or experience page into a clean marketplace listing for a gift shop called Givit. ` +
    `Use only the page metadata given to you — never invent specifics you weren't told (no fake prices/reviews). ` +
    `If the price isn't in the metadata, make a reasonable estimate based on the category and note it's estimated. ` +
    `Categories must be exactly one of: ${CATEGORIES.join(", ")}. Return strict JSON only, matching the requested shape.`;

  const user = JSON.stringify({
    url,
    pageMetadata: meta ? { title: meta.title, description: meta.description, publisher: meta.publisher, author: meta.author } : null,
    responseShape: {
      name: "string, clean product/experience name (not a URL slug)",
      brand: "string, the retailer or provider",
      category: CATEGORIES.join("|"),
      isExperience: "boolean",
      priceUsd: "number, best estimate if not in metadata",
      priceIsEstimate: "boolean",
      description: "string, 1-2 sentences, warm gift-shop tone, no filler",
    },
  });

  const result = await callGeminiJSON(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.4, maxTokens: 400 },
  );

  const category = CATEGORIES.includes(result?.category) ? result.category : "home";
  const priceUsd = typeof result?.priceUsd === "number" && result.priceUsd > 0 ? result.priceUsd : 25;

  return {
    name: typeof result?.name === "string" && result.name.trim() ? result.name.trim().slice(0, 200) : null,
    brand: typeof result?.brand === "string" && result.brand.trim() ? result.brand.trim().slice(0, 100) : (meta?.publisher ?? null),
    category,
    isExperience: Boolean(result?.isExperience) || category === "experiences",
    price: priceUsd.toFixed(2),
    priceIsEstimate: result?.priceIsEstimate !== false,
    description: typeof result?.description === "string" ? result.description.trim().slice(0, 500) : null,
    // No imageUrl here on purpose: the client resolves photos exclusively
    // through GET /api/photo (see api/_lib/photo.mjs), which redirects to
    // the real image or 404s cleanly. Handing back Microlink's raw
    // data.image.url here would let a caller embed it directly, bypassing
    // that ORB-safe redirect path.
  };
}
