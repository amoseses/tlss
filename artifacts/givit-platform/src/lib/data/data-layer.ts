/**
 * Data layer that tries Supabase first, falls back to seed data.
 * This allows the app to work with real data once the SQL schema is run,
 * while still having the seed data as a fallback for development.
 */
import { createClient } from "@/lib/supabase/client";
import { getAllMarketplaceProducts, getMarketplaceProductBySlug, getMarketplaceProducts, MARKETPLACE_CATEGORIES, type MarketplaceProduct } from "@/lib/data/marketplace";

export async function fetchProducts(options?: { categorySlug?: string; q?: string }): Promise<MarketplaceProduct[]> {
  try {
    const supabase = createClient();
    let query = supabase.from("products").select("*");
    if (options?.categorySlug) {
      query = query.eq("category_id", options.categorySlug);
    }
    if (options?.q) {
      query = query.ilike("name", `%${options.q}%`);
    }
    const { data, error } = await query.limit(50);
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
        images: p.images || [],
        category: null,
        is_published: p.is_published,
        gift_match_score: p.gift_match_score || 0,
        affiliate_url: p.affiliate_url,
        retailer: p.retailer,
        brand: p.brand,
        price_range: "",
        rank: 0,
        category_rank: 0,
        tested_badge: "",
        interests: p.interests || [],
        occasions: p.occasions || [],
        recipients: p.recipients || [],
        ai_summary: p.ai_summary || "",
        why_we_picked_it: p.why_we_picked_it || "",
      })) as MarketplaceProduct[];
    }
  } catch {
    // Fall through to seed data
  }
  // Fallback to seed data
  return getMarketplaceProducts(options);
}

export async function fetchProductBySlug(slug: string): Promise<MarketplaceProduct | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("products").select("*").eq("slug", slug).single();
    if (error) throw error;
    if (data) {
      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        description: data.description,
        price_cents: data.price_cents,
        images: data.images || [],
        category: null,
        is_published: data.is_published,
        gift_match_score: data.gift_match_score || 0,
        affiliate_url: data.affiliate_url,
        retailer: data.retailer,
        brand: data.brand,
        price_range: "",
        rank: 0,
        category_rank: 0,
        tested_badge: "",
        interests: data.interests || [],
        occasions: data.occasions || [],
        recipients: data.recipients || [],
        ai_summary: data.ai_summary || "",
        why_we_picked_it: data.why_we_picked_it || "",
      } as MarketplaceProduct;
    }
  } catch {
    // Fall through
  }
  return getMarketplaceProductBySlug(slug);
}

export { MARKETPLACE_CATEGORIES, getAllMarketplaceProducts, getMarketplaceProducts, getMarketplaceProductBySlug };
export type { MarketplaceProduct };