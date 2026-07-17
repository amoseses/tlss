import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Play, Sparkles } from "lucide-react";

import { WishlistButton } from "@/components/product/wishlist-button";
import type { MarketplaceProduct } from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/format";
import { productPhotoFallback, resolveProductImageSrc } from "@/lib/product-photo";
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
  const [imageSrc, setImageSrc] = useState(src);
  const marketplaceProduct = product as Product & Partial<MarketplaceProduct>;
  const salePrice = marketplaceProduct.sale_price_cents;
  const priceLabel = salePrice ? formatMoney(salePrice) : marketplaceProduct.price_range ?? formatMoney(product.price_cents);
  // A "#47 in Tech" badge on a 700-item catalog isn't a credible ranking
  // signal — it reads as filler. Only surface the rank when it's genuinely
  // a top-10 standing; every other card just shows the honest basics
  // (name, why-this-gift, rating, price) with no algorithmic-looking score.
  const categoryRank = marketplaceProduct.category_rank ?? marketplaceProduct.rank ?? 1;
  const withinTop10 = Boolean(rankLabel) || categoryRank <= 10;
  const rankingLabel = rankLabel ?? (marketplaceProduct.category?.name
    ? `#${categoryRank} in ${marketplaceProduct.category.name}`
    : `#${categoryRank} in Marketplace`);
  const blurb = marketplaceProduct.why_we_picked_it || (!compact ? marketplaceProduct.ai_summary : undefined);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-givit-ember/30 hover:shadow-xl hover:shadow-black/10">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className={featured ? "relative aspect-[4/3] w-full overflow-hidden bg-givit-sand" : "relative aspect-square w-full overflow-hidden bg-givit-sand"}>
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            onError={() => setImageSrc(productPhotoFallback(product.id || product.slug))}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {withinTop10 && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-givit-ink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 text-givit-coral" />
              <span className="line-clamp-1">{rankingLabel}</span>
            </div>
          )}
          {salePrice ? (
            <div className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Deal
            </div>
          ) : null}
          {marketplaceProduct.video_url && (
            <button
              type="button"
              title="Watch video"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(marketplaceProduct.video_url!, "_blank", "noopener,noreferrer");
              }}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-sm transition hover:scale-110 hover:bg-black/85"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-200 group-hover:translate-y-0">
            <div className="flex items-center justify-center gap-1.5 bg-givit-ember/90 py-2 text-white backdrop-blur-sm">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">View product</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {marketplaceProduct.brand && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-givit-ember/80">{marketplaceProduct.brand}</p>
          )}

          <p className={`line-clamp-2 text-left font-serif font-semibold leading-snug text-foreground transition-colors group-hover:text-givit-ember ${featured ? "text-lg" : "text-sm"}`}>
            {product.name}
          </p>

          {blurb && (
            <p className="line-clamp-2 text-left text-xs italic leading-snug text-muted-foreground">
              "{blurb}"
            </p>
          )}

          {avgRating != null && reviewCount != null && reviewCount > 0 ? (
            <StarRating value={avgRating} count={reviewCount} size={compact ? 12 : 14} />
          ) : null}

          <div className="mt-auto flex items-center gap-2 pt-1.5">
            <p className="price-tag text-left text-base font-bold tabular-nums text-givit-ember">{priceLabel}</p>
            {salePrice ? <p className="text-xs text-muted-foreground line-through">{formatMoney(product.price_cents)}</p> : null}
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3">
        <WishlistButton
          compact
          item={{
            slug: product.slug,
            name: product.name,
            href: `/products/${product.slug}`,
            image: imageSrc,
            price: priceLabel,
          }}
        />
      </div>
    </article>
  );
}
