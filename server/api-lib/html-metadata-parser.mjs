/**
 // Helper to parse OpenGraph, JSON-LD, and Shopify/E-commerce HTML for price and title metadata.
 */
export function parseHtmlMetadata(html, url) {
  if (!html || typeof html !== "string") return null;

  let title = null;
  let price = null;
  let image = null;
  let description = null;

  // 1. Check OpenGraph Meta Tags
  const ogTitle = html.match(/<meta\s+[^>]*property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:title["']/i);
  if (ogTitle) title = ogTitle[1];

  const ogImage = html.match(/<meta\s+[^>]*property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (ogImage) image = ogImage[1];

  const ogDesc = html.match(/<meta\s+[^>]*property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                 html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:description["']/i);
  if (ogDesc) description = ogDesc[1];

  // 2. Check direct OpenGraph or schema price tags
  const priceMeta = html.match(/<meta\s+[^>]*property=["'](?:og:price:amount|product:price:amount)["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["'](?:og:price:amount|product:price:amount)["']/i) ||
                    html.match(/<meta\s+[^>]*itemprop=["']price["']\s+content=["']([^"']+)["']/i);
  if (priceMeta) {
    const parsed = Number.parseFloat(priceMeta[1].replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed) && parsed > 0) {
      price = parsed;
    }
  }

  // 3. Check JSON-LD Scripts (<script type="application/ld+json">)
  if (!price) {
    const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const rawJson = ldMatch[1].trim();
        const data = JSON.parse(rawJson);
        const objects = Array.isArray(data) ? data : [data];
        for (const obj of objects) {
          if (obj["@type"] === "Product" || obj["offers"] || obj["@graph"]) {
            const graph = obj["@graph"] || [obj];
            for (const item of graph) {
              const offers = item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]) : [];
              for (const offer of offers) {
                const p = offer.price || offer.lowPrice || offer.highPrice;
                if (p) {
                  const num = Number.parseFloat(String(p).replace(/[^0-9.]/g, ""));
                  if (!Number.isNaN(num) && num > 0) {
                    price = num;
                    break;
                  }
                }
              }
              if (price) break;
            }
          }
          if (price) break;
        }
      } catch {
        // Continue parsing if invalid JSON
      }
      if (price) break;
    }
  }

  // 4. Check Shopify JS variables (e.g., "price": 41600 or "price": 416.0 or priceAmount)
  if (!price) {
    const shopifyCentsMatch = html.match(/"price"\s*:\s*([0-9]{4,6})/);
    if (shopifyCentsMatch) {
      const cents = Number.parseInt(shopifyCentsMatch[1], 10);
      if (cents >= 500 && cents <= 500000) {
        price = cents / 100;
      }
    }
  }

  if (!price) {
    const shopifyPriceMatch = html.match(/"price"\s*:\s*([0-9]+\.[0-9]{1,2})/);
    if (shopifyPriceMatch) {
      const num = Number.parseFloat(shopifyPriceMatch[1]);
      if (!Number.isNaN(num) && num > 0) {
        price = num;
      }
    }
  }

  // 5. Fallback HTML page title
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();
  }

  return {
    title,
    price,
    image,
    description,
    url,
  };
}
