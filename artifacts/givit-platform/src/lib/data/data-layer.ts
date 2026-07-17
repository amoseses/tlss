/**
 * Merges admin-managed Supabase products (the real `products` table) into
 * the static seed catalog. Admin-added products store their category as a
 * plain slug in metadata.category rather than products.category_id — the
 * static MARKETPLACE_CATEGORIES list uses fake string ids ("cat-tech")
 * that don't match the real categories table's UUIDs, so resolving by
 * slug through the same lookup the rest of the app already uses avoids
 * that mismatch entirely.
 */
import { createClient } from "@/lib/supabase/client";
import { getAllMarketplaceProducts, getMarketplaceProductBySlug, MARKETPLACE_CATEGORIES, type MarketplaceProduct } from "@/lib/data/marketplace";

const categoryBySlug = new Map(MARKETPLACE_CATEGORIES.map((c) => [c.slug, c]));

function dbProductToMarketplaceProduct(p: any, fallbackRank: number): MarketplaceProduct {
  const categorySlug = p.metadata?.category as string | undefined;
  const category = (categorySlug && categoryBySlug.get(categorySlug)) || null;
  const images = Array.isArray(p.images) && p.images.length > 0
    ? p.images.map((img: any, i: number) => ({ id: `${p.id}-image-${i}`, product_id: p.id, storage_path: img.storage_path ?? img, sort_order: img.sort_order ?? i }))
    : [];
  // Respect a manual rank set from the admin Rankings tab when present —
  // otherwise fall back to insertion order so newly-imported products
  // without an explicit override still get a stable (if low-priority) slot.
  const rank = typeof p.rank === "number" ? p.rank : fallbackRank;
  const categoryRank = typeof p.category_rank === "number" ? p.category_rank : fallbackRank;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description ?? "",
    sku: `GIVIT-DB-${p.id.slice(0, 8)}`,
    price_cents: p.price_cents,
    weight_oz: p.weight_oz ?? 8,
    min_order_qty: p.min_order_qty ?? 1,
    stock: p.stock ?? 50,
    is_published: p.is_published ?? true,
    category_id: category?.id ?? null,
    seller_id: p.seller_id ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at ?? p.created_at,
    affiliate_url: p.affiliate_url,
    video_url: p.video_url ?? null,
    retailer: p.retailer ?? p.brand ?? "",
    brand: p.brand ?? "",
    price_range: p.price_cents < 3000 ? "Under $30" : p.price_cents < 10000 ? "$30-$100" : "$100+",
    rank,
    category_rank: categoryRank,
    gift_match_score: p.gift_match_score ?? 82,
    tested_badge: "Admin added",
    interests: p.interests ?? [],
    occasions: p.occasions?.length ? p.occasions : ["birthday", "holiday"],
    recipients: p.recipients?.length ? p.recipients : ["friend", "family"],
    ai_summary: p.ai_summary ?? "",
    why_we_picked_it: p.why_we_picked_it ?? "",
    category,
    images,
  } satisfies MarketplaceProduct;
}

/** Real, admin-managed products from Supabase — published + approved only. */
export async function fetchAdminProducts(): Promise<MarketplaceProduct[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_published", true)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((p, i) => dbProductToMarketplaceProduct(p, 8000 + i));
  } catch {
    return [];
  }
}

/** Static catalog + localStorage-imported + Supabase admin products, deduped by slug (DB wins). */
export async function fetchAllProducts(): Promise<MarketplaceProduct[]> {
  const [seed, admin] = await Promise.all([Promise.resolve(getAllMarketplaceProducts()), fetchAdminProducts()]);
  const bySlug = new Map(seed.map((p) => [p.slug, p]));
  for (const p of admin) bySlug.set(p.slug, p);
  return Array.from(bySlug.values());
}

export async function fetchProductBySlug(slug: string): Promise<MarketplaceProduct | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    if (data) return dbProductToMarketplaceProduct(data, 8000);
  } catch {
    // fall through to seed data
  }
  return getMarketplaceProductBySlug(slug);
}

export { MARKETPLACE_CATEGORIES, getAllMarketplaceProducts };
export type { MarketplaceProduct };
