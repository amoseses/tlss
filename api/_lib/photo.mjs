/**
 * Resolves the real product photo (og:image / Twitter card / product JSON-LD)
 * for a page URL via Microlink, server-side. Doing this in the browser as a
 * direct <img src="https://api.microlink.io/...&embed=image.url"> gets
 * blocked by ORB (Opaque Response Blocking) whenever Microlink can't resolve
 * a clean image response for a given URL — the ambiguous/error response
 * doesn't match what an <img> tag expects. Resolving here and redirecting to
 * the real underlying image (or 404-ing cleanly) avoids that entirely.
 */
export async function resolveProductPhotoUrl(pageUrl) {
  const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const imageUrl = json?.data?.image?.url || json?.data?.logo?.url;
  return typeof imageUrl === "string" && imageUrl.startsWith("http") ? imageUrl : null;
}
