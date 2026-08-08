// Plain Microlink metadata proxy — no AI, no secret key needed. Kept
// server-side purely to avoid CORS/rate-limit issues calling Microlink
// directly from the browser. The AI normalization pass that used to happen
// here moved client-side to Groq (see src/lib/admin/imported-products.ts).
export async function fetchPageMetadata(pageUrl) {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
