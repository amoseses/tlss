import { ProductCard } from "@/components/product/product-card";
import type { Product, ProductImage } from "@/types/database";

type Item = Product & { images: ProductImage[] };

type RatingStat = { avg_rating: number | string | null; review_count: number | null };

type Props = {
  products: Item[];
  ratings: Record<string, RatingStat | undefined>;
  compact?: boolean;
};

export function ProductGrid({ products, ratings, compact = false }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => {
        const s = ratings[p.id];
        const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
        const count = s?.review_count ?? 0;
        return (
          <ProductCard
            key={p.id}
            product={p}
            images={p.images}
            avgRating={avg ?? undefined}
            reviewCount={count}
            compact={compact}
          />
        );
      })}
    </div>
  );
}
