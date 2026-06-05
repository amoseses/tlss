import { cache } from "react";

import {
  getPublishedProducts,
  getRatingStatsForProducts,
} from "@/lib/data/catalog";
import type { Category, Product, ProductImage, ProductRatingStats, ProductSalesStats } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export type StorefrontProduct = Product & {
  category: Category | null;
  images: ProductImage[];
};

const SECTION_SIZE = 6;

/** Products created within this window are preferred for New Arrivals. */
const NEW_ARRIVAL_DAYS = 90;

/** Recency boost half-life for featured scoring (days). */
const FEATURED_RECENCY_DAYS = 30;

export const getSalesStatsForProducts = cache(async (productIds: string[]) => {
  if (productIds.length === 0) return new Map<string, ProductSalesStats>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_sales_stats")
    .select("*")
    .in("product_id", productIds);

  if (error) throw error;

  const map = new Map<string, ProductSalesStats>();
  for (const row of (data ?? []) as ProductSalesStats[]) {
    map.set(row.product_id, row);
  }
  return map;
});

function ratingOf(
  ratings: Map<string, ProductRatingStats>,
  productId: string,
): { avg: number; count: number } {
  const row = ratings.get(productId);
  const count = row?.review_count ?? 0;
  const avg =
    row?.avg_rating != null ? Number.parseFloat(String(row.avg_rating)) : 0;
  return { avg, count };
}

function salesOf(
  sales: Map<string, ProductSalesStats>,
  productId: string,
): { units: number; orders: number } {
  const row = sales.get(productId);
  return { units: row?.units_sold ?? 0, orders: row?.order_count ?? 0 };
}

function daysSince(iso: string, now = Date.now()) {
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/** Higher = stronger featured candidate (mix of traction, quality, freshness, availability). */
export function featuredScore(
  product: StorefrontProduct,
  ratings: Map<string, ProductRatingStats>,
  sales: Map<string, ProductSalesStats>,
  now = Date.now(),
): number {
  const { avg, count } = ratingOf(ratings, product.id);
  const { units, orders } = salesOf(sales, product.id);
  const ageDays = daysSince(product.created_at, now);

  const recencyBoost =
    ageDays <= 7 ? 28 : ageDays <= FEATURED_RECENCY_DAYS ? 16 - ageDays * 0.35 : 0;

  const availabilityBoost =
    product.stock >= product.min_order_qty ? 8 : product.stock > 0 ? 3 : 0;

  return (
    units * 4 +
    orders * 6 +
    count * 3 +
    avg * 12 +
    recencyBoost +
    availabilityBoost
  );
}

/** Best sellers: real order volume first, then reviews as tie-breaker. */
export function compareBestSellers(
  a: StorefrontProduct,
  b: StorefrontProduct,
  ratings: Map<string, ProductRatingStats>,
  sales: Map<string, ProductSalesStats>,
): number {
  const aSales = salesOf(sales, a.id);
  const bSales = salesOf(sales, b.id);

  if (bSales.units !== aSales.units) return bSales.units - aSales.units;
  if (bSales.orders !== aSales.orders) return bSales.orders - aSales.orders;

  const aRating = ratingOf(ratings, a.id);
  const bRating = ratingOf(ratings, b.id);
  if (bRating.count !== aRating.count) return bRating.count - aRating.count;
  if (bRating.avg !== aRating.avg) return bRating.avg - aRating.avg;

  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

export function compareNewArrivals(a: StorefrontProduct, b: StorefrontProduct): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function pickUnique(
  sorted: StorefrontProduct[],
  count: number,
  used: Set<string>,
): StorefrontProduct[] {
  const picked: StorefrontProduct[] = [];
  for (const product of sorted) {
    if (picked.length >= count) break;
    if (used.has(product.id)) continue;
    used.add(product.id);
    picked.push(product);
  }
  return picked;
}

export type HomePageSections = {
  featured: StorefrontProduct[];
  bestSellers: StorefrontProduct[];
  newArrivals: StorefrontProduct[];
  ratings: Record<string, ProductRatingStats | undefined>;
};

export const getHomePageSections = cache(async (): Promise<HomePageSections> => {
  const products = (await getPublishedProducts()) as StorefrontProduct[];
  const ids = products.map((p) => p.id);

  const [ratingsMap, salesMap] = await Promise.all([
    getRatingStatsForProducts(ids),
    getSalesStatsForProducts(ids),
  ]);

  const ratings = Object.fromEntries(ratingsMap);
  const now = Date.now();
  const used = new Set<string>();

  const featuredSorted = [...products].sort(
    (a, b) => featuredScore(b, ratingsMap, salesMap, now) - featuredScore(a, ratingsMap, salesMap, now),
  );
  const featured = pickUnique(featuredSorted, SECTION_SIZE, used);

  const bestSellerSorted = [...products].sort((a, b) =>
    compareBestSellers(a, b, ratingsMap, salesMap),
  );
  const bestSellers = pickUnique(bestSellerSorted, SECTION_SIZE, used);

  const recentCutoff = products.filter((p) => daysSince(p.created_at, now) <= NEW_ARRIVAL_DAYS);
  const newArrivalPool = recentCutoff.length >= SECTION_SIZE ? recentCutoff : products;
  const newArrivalSorted = [...newArrivalPool].sort(compareNewArrivals);
  const newArrivals = pickUnique(newArrivalSorted, SECTION_SIZE, used);

  return { featured, bestSellers, newArrivals, ratings };
});

/** Shared ranking for catalog "Best Sellers" sort. */
export async function sortProductsByBestSellers<T extends StorefrontProduct>(
  products: T[],
  ratingsMap: Map<string, ProductRatingStats>,
): Promise<T[]> {
  const salesMap = await getSalesStatsForProducts(products.map((p) => p.id));
  return [...products].sort((a, b) => compareBestSellers(a, b, ratingsMap, salesMap));
}
