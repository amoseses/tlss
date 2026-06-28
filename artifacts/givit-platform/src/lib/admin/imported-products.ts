import type { MarketplaceProduct } from "@/lib/data/marketplace";
import { MARKETPLACE_CATEGORIES } from "@/lib/data/marketplace";
import type { Category } from "@/types/database";

const STORAGE_KEY = "givit-admin-imported-products";

export type ImportedProductRow = {
  url: string;
  name: string;
  brand: string;
  price: string;
  category: string;
  description?: string;
  status: "pending" | "processing" | "done" | "error";
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
  // Microlink resolves OpenGraph/Twitter/product JSON-LD images when available,
  // which is closer to the item photo than a full-page screenshot.
  return `https://api.microlink.io/?url=${encodeURIComponent(normalizeProductUrl(url))}&embed=image.url`;
}

export function extractProductFromUrl(url: string, hints?: Partial<ImportedProductRow>): Omit<ImportedProductRow, "status"> {
  const name = hints?.name?.trim() || extractNameFromUrl(url);
  const brand = hints?.brand?.trim() || guessBrand(url, name);
  const category = hints?.category?.trim() || guessCategory(url, name, hints?.category);
  const price = hints?.price?.trim() || String(Math.max(25, 20 + (name.length % 80)));

  return { url: normalizeProductUrl(url), name, brand, price, category };
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
      rank: baseRank + index,
      category_rank: index + 1,
      gift_match_score: 82,
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
        storage_path: productPageImageUrl(item.affiliateUrl),
        sort_order: 0,
      }],
    } satisfies MarketplaceProduct;
  });
}

export function getImportedCount() {
  return readStored().length;
}
