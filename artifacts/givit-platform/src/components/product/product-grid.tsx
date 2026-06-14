import { ProductCard } from "@/components/product/product-card";
import type { MarketplaceProduct } from "@/lib/data/marketplace";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, index) => {
        const s = ratings[p.id];
        const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
        const count = s?.review_count ?? 0;
        const marketplaceProduct = p as Item & Partial<MarketplaceProduct>;
        const contextLabel = rankContext?.query || rankContext?.categoryName;
        const rankLabel = contextLabel
          ? `#${index + 1} in ${contextLabel}`
          : `#${marketplaceProduct.category_rank ?? marketplaceProduct.rank ?? index + 1} in ${marketplaceProduct.category?.name || "Marketplace"}`;
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
