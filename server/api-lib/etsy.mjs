// Pulls real, individually-sourced listings from Etsy's public Open API v3
// (keystring-only, no OAuth -- this never touches an individual Etsy user's
// account, cart, or shop) and maps them onto GIVIT's own `products` row
// shape so they merge into the marketplace the exact same way any other
// admin-added product does (see src/lib/data/data-layer.ts).
const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";
const LISTINGS_PER_CATEGORY = 10;

// Keyword chosen per GIVIT category rather than Etsy's own taxonomy tree --
// keeps this to one search call per category instead of a taxonomy lookup
// plus a search call. "experiences" and "gaming" are deliberately left out:
// Etsy's catalog is handmade/vintage/craft goods and has essentially
// nothing that fits either category well.
const CATEGORY_KEYWORDS = {
  tech: "tech desk accessory gift",
  home: "home decor gift",
  kitchen: "kitchen gift handmade",
  books: "book lover gift",
  writing: "writing journal gift",
  beauty: "handmade beauty gift",
  outdoor: "outdoor camping gift",
  fitness: "fitness gift accessory",
  pets: "pet lover gift handmade",
  art: "art print gift",
  food: "gourmet food gift",
};

function centsFromEtsyPrice(price) {
  if (!price || typeof price.amount !== "number" || !price.divisor) return null;
  return Math.round((price.amount / price.divisor) * 100);
}

function cleanTitle(title) {
  const trimmed = (title || "").trim().replace(/\s+/g, " ");
  if (trimmed.length <= 100) return trimmed;
  const cut = trimmed.slice(0, 100);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 60 ? cut.slice(0, lastSpace) : cut}...`;
}

function bestImageUrl(image) {
  return image?.url_570xN || image?.url_fullxfull || image?.url_170x135 || null;
}

async function fetchListingsForCategory(apiKey, categorySlug, keywords) {
  const params = new URLSearchParams({
    keywords,
    limit: String(LISTINGS_PER_CATEGORY),
    includes: "Images,Shop",
    sort_on: "score",
  });
  const res = await fetch(`${ETSY_API_BASE}/listings/active?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Etsy listings/active failed for "${categorySlug}" (${res.status}): ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  return Array.isArray(body?.results) ? body.results : [];
}

function listingToProductRow(listing, categorySlug) {
  const priceCents = centsFromEtsyPrice(listing.price);
  if (listing.price?.currency_code !== "USD" || !priceCents || priceCents <= 0) return null;

  const images = Array.isArray(listing.images) ? listing.images.map(bestImageUrl).filter(Boolean) : [];
  if (images.length === 0) return null;

  const shopName = listing.shop?.shop_name || "an Etsy shop";
  return {
    slug: `etsy-${listing.listing_id}`,
    name: cleanTitle(listing.title),
    description: `${(listing.description || "").trim().slice(0, 280)}\n\nSold by ${shopName} on Etsy.`,
    price_cents: priceCents,
    min_order_qty: 1,
    stock: typeof listing.quantity === "number" && listing.quantity > 0 ? listing.quantity : 20,
    is_published: true,
    is_approved: true,
    images: images.map((url) => ({ storage_path: url })),
    metadata: { category: categorySlug, source: "etsy", etsy_listing_id: listing.listing_id },
    affiliate_url: listing.url,
    retailer: "Etsy",
    brand: shopName,
    gift_match_score: 75,
    ai_summary: cleanTitle(listing.title),
    why_we_picked_it: "A real, individually-made find from Etsy that matches this category.",
  };
}

/**
 * Fetches and maps listings across every mapped category. Returns
 * { rows, errors } -- errors are per-category and non-fatal, since one
 * category's Etsy call failing shouldn't block the rest from syncing.
 */
export async function collectEtsyProductRows() {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) throw new Error("ETSY_API_KEY is not configured on the server.");

  const rows = [];
  const errors = [];
  const categoryEntries = Object.entries(CATEGORY_KEYWORDS);

  const results = await Promise.allSettled(
    categoryEntries.map(([categorySlug, keywords]) => fetchListingsForCategory(apiKey, categorySlug, keywords)),
  );

  results.forEach((result, i) => {
    const [categorySlug] = categoryEntries[i];
    if (result.status === "rejected") {
      errors.push(`${categorySlug}: ${result.reason?.message || result.reason}`);
      return;
    }
    for (const listing of result.value) {
      const row = listingToProductRow(listing, categorySlug);
      if (row) rows.push(row);
    }
  });

  return { rows, errors };
}
