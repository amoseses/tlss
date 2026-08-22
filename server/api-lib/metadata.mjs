import { parseHtmlMetadata } from "./html-metadata-parser.mjs";

/**
 * Fetches page metadata (title, price, image, description) for product URLs.
 * Uses Microlink proxy first, with an enhanced direct HTML/OpenGraph/JSON-LD scraper fallback.
 */
export async function fetchPageMetadata(pageUrl) {
  if (!pageUrl || typeof pageUrl !== "string") return null;

  // 1. Try direct HTML scraper (fastest & most reliable for e-commerce stores)
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();
      const meta = parseHtmlMetadata(html, pageUrl);
      if (meta && meta.price) {
        return meta;
      }
    }
  } catch {
    // Fall back to Microlink if direct fetch fails
  }

  // 2. Microlink API Fallback
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return json.data;
      }
    }
  } catch {
    // Return null if both fail
  }

  return null;
}
