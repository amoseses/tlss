import { ProductCard } from "@/components/product/product-card";
import type { Product, ProductImage } from "@/types/database";

type Item = Product & { images: ProductImage[] };

type RatingStat = { avg_rating: number | string | null; review_count: number | null };

type Props = {
  products: Item[];
  ratings: Record<string, RatingStat | undefined>;
  compact?: boolean;
  rankContext?: { query?: string; categoryName?: string };
};

export function ProductGrid({ products, ratings, compact = false, rankContext }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, index) => {
        const s = ratings[p.id];
        const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
        const count = s?.review_count ?? 0;
        const contextLabel = rankContext?.query || rankContext?.categoryName;
        // Only badge the true top 10 of whatever list is being browsed — a
        // "#47 in Tech" label out of 700 products isn't a credible ranking
        // signal, it just reads as filler. Beyond that, leave rankLabel
        // unset so ProductCard falls back to its own top-10 category check.
        const rankLabel = contextLabel && index < 10 ? `#${index + 1} in ${contextLabel}` : undefined;
        return (
          <ProductCard
            key={p.id}
            product={p}
            images={p.images}
            avgRating={avg ?? undefined}
            reviewCount={count}
            compact={compact}
            rankLabel={rankLabel}
          />
        );
      })}
    </div>
  );
}
