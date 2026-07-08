import type { MarketplaceProduct } from "@/lib/data/marketplace";
import { MARKETPLACE_CATEGORIES } from "@/lib/data/marketplace";
import type { Category } from "@/types/database";
import { callGeminiJSON } from "@/lib/ai/gemini-client";

const EXTRACT_CATEGORIES = ["tech", "kitchen", "writing", "beauty", "fitness", "outdoor", "pets", "art", "experiences", "home", "gaming"];

const STORAGE_KEY = "givit-admin-imported-products";

export type ImportedProductRow = {
  url: string;
  name: string;
  brand: string;
  price: string;
  category: string;
  description?: string;
  status: "pending" | "processing" | "done" | "error";
  imageUrl?: string;
};

type StoredProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  priceCents: number;
  affiliateUrl: string;
  summary: string;
  why: string;
  interests: string[];
  importedAt: string;
  imageUrl?: string;
  rank?: number;
  categoryRank?: number;
  giftMatchScore?: number;
};

function slugSafe(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function guessCategory(url: string, name: string, hint?: string): string {
  const text = `${url} ${name} ${hint ?? ""}`.toLowerCase();
  if (/game|xbox|playstation|nintendo|steam/.test(text)) return "gaming";
  if (/coffee|kitchen|cook|food|recipe|bake/.test(text)) return "kitchen";
  if (/book|read|kindle|journal|pen|write/.test(text)) return "writing";
  if (/beauty|skin|hair|makeup|spa/.test(text)) return "beauty";
  if (/fitness|yoga|run|gym|workout/.test(text)) return "fitness";
  if (/camp|outdoor|hike|trail|yeti/.test(text)) return "outdoor";
  if (/pet|dog|cat/.test(text)) return "pets";
  if (/art|craft|paint|draw/.test(text)) return "art";
  if (/experience|class|ticket|membership/.test(text)) return "experiences";
  if (/home|decor|bed|blanket|lamp/.test(text)) return "home";
  if (/tech|apple|anker|logitech|headphone|charger/.test(text)) return "tech";
  return hint?.toLowerCase() || "home";
}

function guessBrand(url: string, name: string): string {
  const hostMatch = url.match(/https?:\/\/(?:www\.)?([^./]+)/);
  const host = hostMatch?.[1] ?? "";
  const known: Record<string, string> = {
    amazon: "Amazon",
    apple: "Apple",
    target: "Target",
    bestbuy: "Best Buy",
    etsy: "Etsy",
    nike: "Nike",
    patagonia: "Patagonia",
    aeropress: "AeroPress",
    lego: "LEGO",
  };
  if (known[host]) return known[host];
  const firstWord = name.split(/\s+/)[0];
  return firstWord && firstWord.length > 2 ? firstWord : "Curated";
}

function extractNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    return path.replace(/[-_+]/g, " ").replace(/\d+/g, "").trim() || "Imported product";
  } catch {
    return "Imported product";
  }
}

export function normalizeProductUrl(url: string) {
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function productPageImageUrl(url: string) {
  // Resolved server-side (see api/photo.ts) so the browser never embeds a
  // direct <img src="https://api.microlink.io/..."> — that pattern gets
  // silently blocked by ORB whenever Microlink can't resolve a clean image
  // for the given URL, which was the main cause of photos falling back to
  // generic stock images across the marketplace.
  // Absolute (not "/api/photo?...") so resolveProductImageSrc's http(s)://
  // check treats it as a real URL instead of a Supabase storage path.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/photo?url=${encodeURIComponent(normalizeProductUrl(url))}`;
}

export function productImageCandidates(url: string) {
  return [productPageImageUrl(url)];
}

export function bestProductImageUrl(url: string, explicit?: string) {
  return explicit?.trim() || productImageCandidates(url)[0]!;
}

export function extractProductFromUrl(url: string, hints?: Partial<ImportedProductRow>): Omit<ImportedProductRow, "status"> {
  const name = hints?.name?.trim() || extractNameFromUrl(url);
  const brand = hints?.brand?.trim() || guessBrand(url, name);
  const category = hints?.category?.trim() || guessCategory(url, name, hints?.category);
  const price = hints?.price?.trim() || String(Math.max(25, 20 + (name.length % 80)));

  return { url: normalizeProductUrl(url), name, brand, price, category, imageUrl: hints?.imageUrl || bestProductImageUrl(url) };
}

/**
 * Real AI extraction (page metadata + Gemini LLM) for admin bulk import —
 * falls back to the regex/heuristic extractProductFromUrl() above if
 * metadata fetch or the AI call fails, so a bulk import never hard-fails.
 * Metadata comes from /api/metadata (plain Microlink proxy, no AI, no
 * secret key); the normalization pass itself runs client-side via Gemini
 * using the browser-exposed Vite Gemini key.
 */
export async function extractProductWithAI(url: string, hints?: Partial<ImportedProductRow>): Promise<Omit<ImportedProductRow, "status"> & { aiPowered: boolean }> {
  const fallback = extractProductFromUrl(url, hints);
  try {
    const metaRes = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
    const meta = metaRes.ok ? (await metaRes.json())?.data : null;

    const system =
      `You turn a raw product or experience page into a clean marketplace listing for a gift shop called Givit. ` +
      `Use only the page metadata given to you — never invent specifics you weren't told (no fake prices/reviews). ` +
      `If the price isn't in the metadata, make a reasonable estimate based on the category and note it's estimated. ` +
      `Categories must be exactly one of: ${EXTRACT_CATEGORIES.join(", ")}. Return strict JSON only, matching the requested shape, with no markdown code fences.`;

    const user = JSON.stringify({
      url,
      pageMetadata: meta ? { title: meta.title, description: meta.description, publisher: meta.publisher, author: meta.author } : null,
      responseShape: {
        name: "string, clean product/experience name (not a URL slug)",
        brand: "string, the retailer or provider",
        category: EXTRACT_CATEGORIES.join("|"),
        isExperience: "boolean",
        priceUsd: "number, best estimate if not in metadata",
        priceIsEstimate: "boolean",
        description: "string, 1-2 sentences, warm gift-shop tone, no filler",
      },
    });

    const ai = await callGeminiJSON(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.4, maxTokens: 400 },
    );

    const category = EXTRACT_CATEGORIES.includes(ai?.category) ? ai.category : fallback.category;
    const priceUsd = typeof ai?.priceUsd === "number" && ai.priceUsd > 0 ? ai.priceUsd.toFixed(2) : fallback.price;

    return {
      url: normalizeProductUrl(url),
      name: hints?.name?.trim() || (typeof ai?.name === "string" && ai.name.trim()) || fallback.name,
      brand: hints?.brand?.trim() || (typeof ai?.brand === "string" && ai.brand.trim()) || fallback.brand,
      category: hints?.category?.trim() || category,
      price: hints?.price?.trim() || priceUsd,
      description: typeof ai?.description === "string" ? ai.description.trim().slice(0, 500) : undefined,
      // Always resolved via /api/photo (fallback.imageUrl), never a raw
      // Microlink URL from the AI response.
      imageUrl: hints?.imageUrl || fallback.imageUrl,
      aiPowered: true,
    };
  } catch {
    return { ...fallback, aiPowered: false };
  }
}

function readStored(): StoredProduct[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredProduct[];
  } catch {
    return [];
  }
}

function writeStored(products: StoredProduct[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function saveImportedProduct(row: ImportedProductRow) {
  const extracted = extractProductFromUrl(row.url, row);
  const slug = `import-${slugSafe(extracted.name)}-${Date.now().toString(36)}`;
  const priceCents = Math.round(Number.parseFloat(extracted.price.replace(/[^0-9.]/g, "")) * 100) || 4999;

  const stored: StoredProduct = {
    slug,
    name: extracted.name,
    brand: extracted.brand,
    category: extracted.category,
    priceCents,
    affiliateUrl: normalizeProductUrl(extracted.url),
    summary: row.description || `Admin-imported ${extracted.category} gift sourced from ${extracted.brand}.`,
    why: "Added via admin spreadsheet import — curated for the Givit marketplace.",
    interests: extracted.category.split(/\s+/).concat(["giftable", "curated"]),
    importedAt: new Date().toISOString(),
    imageUrl: bestProductImageUrl(extracted.url, row.imageUrl),
    rank: readStored().length + 1,
    categoryRank: readStored().filter((p) => guessCategory(p.affiliateUrl, p.name, p.category) === extracted.category).length + 1,
    giftMatchScore: 82,
  };

  writeStored([stored, ...readStored()]);
  return stored;
}

export function getImportedMarketplaceProducts(): MarketplaceProduct[] {
  const categoryBySlug = new Map(MARKETPLACE_CATEGORIES.map((c) => [c.slug, c]));
  const baseRank = 9000;

  return readStored().map((item, index) => {
    const categorySlug = guessCategory(item.affiliateUrl, item.name, item.category);
    const category = categoryBySlug.get(categorySlug) ?? categoryBySlug.get("home") ?? null;
    const id = `gift-${item.slug}`;
    const now = item.importedAt;

    return {
      id,
      slug: item.slug,
      name: item.name,
      description: `${item.summary}\n\nWhy Givit picked it: ${item.why}`,
      sku: `GIVIT-IMP-${String(index + 1).padStart(4, "0")}`,
      price_cents: item.priceCents,
      weight_oz: 8,
      min_order_qty: 1,
      stock: 50,
      is_published: true,
      category_id: category?.id ?? null,
      seller_id: null,
      created_at: now,
      updated_at: now,
      affiliate_url: item.affiliateUrl,
      retailer: item.brand,
      brand: item.brand,
      price_range: item.priceCents < 3000 ? "Under $30" : item.priceCents < 10000 ? "$30-$100" : "$100+",
      rank: item.rank ?? baseRank + index,
      category_rank: item.categoryRank ?? index + 1,
      gift_match_score: item.giftMatchScore ?? 82,
      tested_badge: "Admin import",
      interests: item.interests,
      occasions: ["birthday", "holiday"],
      recipients: ["friend", "family"],
      ai_summary: item.summary,
      why_we_picked_it: item.why,
      category: category as Category | null,
      images: [{
        id: `${id}-image-1`,
        product_id: id,
        storage_path: bestProductImageUrl(item.affiliateUrl, item.imageUrl),
        sort_order: 0,
      }],
    } satisfies MarketplaceProduct;
  });
}

export function getImportedCount() {
  return readStored().length;
}
