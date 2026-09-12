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

// `findAllListingsActive` (the keyword search below) does NOT support an
// `includes` param at all -- it returns bare listings with no images and
// no shop info, full stop. Images/shop only come from the separate batch
// lookup endpoint below, keyed off the listing_ids the search returns.
async function fetchListingsForCategory(apiKey, categorySlug, keywords) {
  const params = new URLSearchParams({
    keywords,
    limit: String(LISTINGS_PER_CATEGORY),
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

// The only endpoint that actually returns image/shop data is this batch
// lookup, via `includes` -- one call per category for up to
// LISTINGS_PER_CATEGORY ids, rather than a separate request per listing.
async function fetchImagesAndShopsByIds(apiKey, listingIds) {
  if (listingIds.length === 0) return new Map();
  const params = new URLSearchParams({
    listing_ids: listingIds.join(","),
    includes: "Images,Shop",
  });
  const res = await fetch(`${ETSY_API_BASE}/listings/batch?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Etsy listings/batch failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  const results = Array.isArray(body?.results) ? body.results : [];
  return new Map(results.map((listing) => [listing.listing_id, listing]));
}

function listingToProductRow(listing, enrichment, categorySlug) {
  const priceCents = centsFromEtsyPrice(listing.price);
  if (listing.price?.currency_code !== "USD" || !priceCents || priceCents <= 0) return null;

  const images = Array.isArray(enrichment?.images) ? enrichment.images.map(bestImageUrl).filter(Boolean) : [];
  if (images.length === 0) return null;

  const shopName = enrichment?.shop?.shop_name || "an Etsy shop";
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

async function collectRowsForCategory(apiKey, categorySlug, keywords) {
  const listings = await fetchListingsForCategory(apiKey, categorySlug, keywords);
  const enrichmentById = await fetchImagesAndShopsByIds(apiKey, listings.map((l) => l.listing_id));
  return listings
    .map((listing) => listingToProductRow(listing, enrichmentById.get(listing.listing_id), categorySlug))
    .filter(Boolean);
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
    categoryEntries.map(([categorySlug, keywords]) => collectRowsForCategory(apiKey, categorySlug, keywords)),
  );

  results.forEach((result, i) => {
    const [categorySlug] = categoryEntries[i];
    if (result.status === "rejected") {
      errors.push(`${categorySlug}: ${result.reason?.message || result.reason}`);
      return;
    }
    rows.push(...result.value);
  });

  return { rows, errors };
}
