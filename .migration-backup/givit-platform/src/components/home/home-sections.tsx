import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import type { Product, ProductImage } from "@/types/database";

type HomeProduct = Product & { images: ProductImage[] };
type RatingStat = { avg_rating: number | string | null; review_count: number | null };

type Props = {
  featured: HomeProduct[];
  bestSellers: HomeProduct[];
  newArrivals: HomeProduct[];
  ratings: Record<string, RatingStat | undefined>;
};

export function HomeFeaturedProducts({
  featured,
  ratings,
}: Pick<Props, "featured" | "ratings">) {
  if (featured.length === 0) return null;

  return (
    <section className="container py-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Featured products</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Hand-picked picks from our sellers</p>
        </div>
        <Link href="/products" className="givit-link text-sm font-medium">
          Shop all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {featured.slice(0, 6).map((p) => {
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
              compact
              featured
            />
          );
        })}
      </div>
    </section>
  );
}

function ProductRow({
  title,
  subtitle,
  href,
  products,
  ratings,
}: {
  title: string;
  subtitle: string;
  href: string;
  products: HomeProduct[];
  ratings: Record<string, RatingStat | undefined>;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container py-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-givit-ink md:text-2xl">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
        </div>
        <Link href={href} className="givit-link text-sm font-medium">
          See more →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
              compact
            />
          );
        })}
      </div>
    </section>
  );
}

export function HomeProductRows({
  bestSellers,
  newArrivals,
  ratings,
}: Pick<Props, "bestSellers" | "newArrivals" | "ratings">) {
  if (bestSellers.length === 0 && newArrivals.length === 0) {
    return (
      <section className="container py-8 text-center">
        <p className="text-muted-foreground text-sm">
          No published products yet. Seed your Supabase catalog to populate the storefront.
        </p>
      </section>
    );
  }

  return (
    <>
      <ProductRow
        title="Best Sellers"
        subtitle="Top-rated picks buyers keep coming back for"
        href="/products?sort=popular"
        products={bestSellers}
        ratings={ratings}
      />
      <ProductRow
        title="New Arrivals"
        subtitle="Fresh listings from sellers this week"
        href="/products?sort=newest"
        products={newArrivals}
        ratings={ratings}
      />
    </>
  );
}
