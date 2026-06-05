import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductImage, ProductRatingStats } from "@/types/database";

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Category[];
});

export const getPublishedProducts = cache(
  async (options?: { categorySlug?: string; q?: string }) => {
    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select(
        `
      *,
      category:categories (*),
      images:product_images (*)
    `,
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (options?.categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", options.categorySlug)
        .single();
      if (cat?.id) query = query.eq("category_id", cat.id);
    }

    if (options?.q?.trim()) {
      const raw = options.q.trim().replace(/[%*,]/g, "");
      if (raw.length > 0) {
        const term = `%${raw}%`;
        query = query.or(`name.ilike.${term},sku.ilike.${term}`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as (Product & {
      category: Category | null;
      images: ProductImage[];
    })[];
  },
);

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories (*),
      images:product_images (*)
    `,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data as
    | (Product & {
        category: Category | null;
        images: ProductImage[];
      })
    | null;
});

export const getRatingStatsForProducts = cache(async (productIds: string[]) => {
  if (productIds.length === 0) return new Map<string, ProductRatingStats>();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_rating_stats")
    .select("*")
    .in("product_id", productIds);
  if (error) throw error;
  const map = new Map<string, ProductRatingStats>();
  for (const row of data as ProductRatingStats[]) {
    map.set(row.product_id, row);
  }
  return map;
});

export const getReviewsForProduct = cache(async (productId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
});
