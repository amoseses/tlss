import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

import { WishlistButton } from "@/components/product/wishlist-button";
import type { MarketplaceProduct } from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/format";
import { isRemoteImageUrl, resolveProductImageSrc } from "@/lib/product-photo";
import type { Product, ProductImage } from "@/types/database";

import { StarRating } from "./star-rating";

type Props = {
  product: Product;
  images: ProductImage[];
  avgRating?: number | null;
  reviewCount?: number;
  compact?: boolean;
  featured?: boolean;
  rankLabel?: string;
};

export function ProductCard({
  product,
  images,
  avgRating,
  reviewCount,
  compact = false,
  featured = false,
  rankLabel,
}: Props) {
  const src = resolveProductImageSrc(product.id, images);
  const marketplaceProduct = product as Product & Partial<MarketplaceProduct>;
  const salePrice = marketplaceProduct.sale_price_cents;
  const priceLabel = salePrice ? formatMoney(salePrice) : marketplaceProduct.price_range ?? formatMoney(product.price_cents);
  const rankingLabel = rankLabel ?? (marketplaceProduct.category?.name
    ? `#${marketplaceProduct.category_rank ?? marketplaceProduct.rank ?? 1} in ${marketplaceProduct.category.name}`
    : `#${marketplaceProduct.rank ?? 1} in Marketplace`);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-2 transition-all duration-200 hover:-translate-y-1 hover:border-givit-ember/30 hover:shadow-lg hover:shadow-black/5">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className={featured ? "relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-givit-sand" : "relative aspect-square w-full overflow-hidden rounded-xl bg-givit-sand"}>
          <img
            src={src}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-givit-ember shadow-sm">
            <span className="line-clamp-1">{rankingLabel}</span>
          </div>
          {salePrice ? (
            <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Deal
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-200 group-hover:translate-y-0">
            <div className="flex items-center justify-center gap-1.5 bg-givit-ember/90 py-2 text-white backdrop-blur-sm">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">View product</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-1 flex-col gap-1 px-0.5">
          <p className="line-clamp-2 text-left text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </p>

          {marketplaceProduct.ai_summary && !compact && (
            <p className="line-clamp-2 text-left text-xs leading-snug text-muted-foreground">
              {marketplaceProduct.ai_summary}
            </p>
          )}

          {avgRating != null && reviewCount != null && reviewCount > 0 ? (
            <StarRating value={avgRating} count={reviewCount} size={compact ? 12 : 14} />
          ) : (
            <span className="text-xs text-muted-foreground">No ratings yet</span>
          )}

          <div className="mt-auto pt-1.5">
            <div className="flex items-center gap-2">
              <p className="price-tag text-left text-base font-bold tabular-nums text-givit-ember">{priceLabel}</p>
              {salePrice ? <p className="text-xs text-muted-foreground line-through">{formatMoney(product.price_cents)}</p> : null}
            </div>
            <p className="text-left text-[10px] text-muted-foreground">
              {marketplaceProduct.brand ? `${marketplaceProduct.brand} · ` : ""}
              Gift Match Score: {marketplaceProduct.gift_match_score ?? 90}/100
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-2">
        <WishlistButton
          compact
          item={{
            slug: product.slug,
            name: product.name,
            href: `/products/${product.slug}`,
            image: src,
            price: priceLabel,
          }}
        />
      </div>
    </article>
  );
}
