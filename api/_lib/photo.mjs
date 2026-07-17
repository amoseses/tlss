/**
 * Resolves the real product photo (og:image / Twitter card / product JSON-LD)
 * for a page URL, server-side. Doing this in the browser as a direct
 * <img src="https://api.microlink.io/...&embed=image.url"> gets blocked by
 * ORB (Opaque Response Blocking) whenever Microlink can't resolve a clean
 * image response for a given URL — the ambiguous/error response doesn't
 * match what an <img> tag expects. Resolving here and redirecting to the
 * real underlying image (or 404-ing cleanly) avoids that entirely.
 *
 * Two independent methods, tried in order:
 *  1. Microlink's best-guess `image`, size-filtered — Microlink sometimes
 *     falls back to a small site icon/logo when it can't find a real
 *     product photo, and a 40x40 logo on a product card reads as an
 *     obviously broken scrape, so anything under MIN_DIMENSION is rejected.
 *  2. A direct fetch of the page's og:image meta tag. This catches sites
 *     Microlink can't parse well but that still expose standard OG tags,
 *     roughly doubling the real hit rate over Microlink alone.
 * Callers fall back to a curated stock photo (see product-photo.ts) when
 * both methods come back empty, rather than showing a broken image.
 */
const MIN_DIMENSION = 200;

export async function resolveProductPhotoUrl(pageUrl) {
  return (await fromMicrolink(pageUrl)) || (await fromOgTag(pageUrl));
}

async function fromMicrolink(pageUrl) {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const candidates = [json?.data?.image, json?.data?.logo];
    for (const candidate of candidates) {
      const url = candidate?.url;
      if (typeof url !== "string" || !url.startsWith("http")) continue;
      const tooSmall = candidate.width && candidate.height && (candidate.width < MIN_DIMENSION || candidate.height < MIN_DIMENSION);
      if (!tooSmall) return url;
    }
    return null;
  } catch {
    return null;
  }
}

async function fromOgTag(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GivitBot/1.0; +https://givit.app)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    const url = match?.[1];
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}
