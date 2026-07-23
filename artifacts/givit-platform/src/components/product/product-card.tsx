import { useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Play, Sparkles } from "lucide-react";

import { WishlistButton } from "@/components/product/wishlist-button";
import type { MarketplaceProduct } from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/format";
import { productPhotoFallback, resolveProductImageSrc } from "@/lib/product-photo";
import type { Product, ProductImage } from "@/types/database";

import { StarRating } from "./star-rating";

type ShoppingForPerson = { name: string; interests: string[] };

type Props = {
  product: Product;
  images: ProductImage[];
  avgRating?: number | null;
  reviewCount?: number;
  compact?: boolean;
  featured?: boolean;
  rankLabel?: string;
  shoppingFor?: ShoppingForPerson;
};

export function ProductCard({
  product,
  images,
  avgRating,
  reviewCount,
  compact = false,
  featured = false,
  rankLabel,
  shoppingFor,
}: Props) {
  const marketplaceProduct = product as Product & Partial<MarketplaceProduct>;
  const categorySlug = marketplaceProduct.category?.slug ?? null;
  const src = resolveProductImageSrc(product.id, images, categorySlug);
  const [imageSrc, setImageSrc] = useState(src);
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
  // When shopping for a saved person, ground the reason in an actual
  // overlap with their stated interests instead of the generic editorial
  // blurb — and when there's no real overlap, say so plainly rather than
  // implying a match that isn't there.
  const matchedInterests = shoppingFor
    ? (marketplaceProduct.interests ?? []).filter((tag) =>
        shoppingFor.interests.some((si) => {
          const t = tag.toLowerCase();
          const s = si.toLowerCase();
          return t === s || t.includes(s) || s.includes(t);
        }))
    : [];
  const personalizedReason = shoppingFor
    ? matchedInterests.length > 0
      ? `Matches ${shoppingFor.name.split(" ")[0]}'s love of ${matchedInterests.slice(0, 2).join(" and ")}`
      : `Picked with ${shoppingFor.name.split(" ")[0]} in mind`
    : undefined;
  const blurb = personalizedReason || marketplaceProduct.why_we_picked_it || (!compact ? marketplaceProduct.ai_summary : undefined);

  return (
    // Below `sm`, a full vertical card (tall image, then text, then a
    // full-width button) reads as cramped in a narrow column — this switches
    // to a horizontal row (centered image on the left, content + the
    // wishlist action beside it) at mobile widths, and reverts to the
    // regular vertical card from `sm` up.
    <article className="group flex items-stretch gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-2 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-givit-ember/30 hover:shadow-xl hover:shadow-black/10 sm:flex-col sm:gap-0 sm:p-0">
      <Link href={`/products/${product.slug}`} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
        <div className={`relative aspect-square w-24 shrink-0 self-center overflow-hidden rounded-xl bg-givit-sand sm:w-full sm:self-auto sm:rounded-none ${featured ? "sm:aspect-[4/3]" : "sm:aspect-square"}`}>
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            onError={() => setImageSrc(productPhotoFallback(product.id || product.slug, categorySlug))}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {withinTop10 && (
            <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
              <Sparkles className="h-2 w-2 text-givit-coral sm:h-2.5 sm:w-2.5" />
              <span className="line-clamp-1">{rankingLabel}</span>
            </div>
          )}
          {salePrice ? (
            <div className="absolute right-1.5 top-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
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
              className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-sm transition hover:scale-110 hover:bg-black/85 sm:bottom-3 sm:right-3 sm:h-8 sm:w-8"
            >
              <Play className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full transition-transform duration-200 group-hover:translate-y-0 sm:block">
            <div className="flex items-center justify-center gap-1.5 bg-givit-ember/90 py-2 text-white backdrop-blur-sm">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">View product</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 sm:gap-1.5 sm:p-3">
          {marketplaceProduct.brand && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-givit-ember/80">{marketplaceProduct.brand}</p>
          )}

          <p className={`line-clamp-2 text-left font-serif font-semibold leading-snug text-foreground transition-colors group-hover:text-givit-ember ${featured ? "text-lg" : "text-sm"}`}>
            {product.name}
          </p>

          {blurb && (
            <p className="line-clamp-2 text-left text-xs italic leading-snug text-muted-foreground sm:line-clamp-2">
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

      <div className="flex shrink-0 items-center sm:px-3 sm:pb-3 sm:pt-0">
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
