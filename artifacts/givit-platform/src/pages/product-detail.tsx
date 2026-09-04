import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ExternalLink, Play, Share2, ShieldCheck, Sparkles, Trophy, Truck } from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { StarRating } from "@/components/product/star-rating";
import { RecentlyViewedRail, RecentlyViewedTracker } from "@/components/personalization/recently-viewed";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GiftReviews } from "@/components/product/gift-reviews";
import {
  MARKETPLACE_RATINGS,
  getMarketplaceProductBySlug,
  getRelatedMarketplaceProducts,
  type MarketplaceProduct,
} from "@/lib/data/marketplace";
import { fetchProductBySlug } from "@/lib/data/data-layer";
import { formatMoney } from "@/lib/format";
import { productPhotoFallback, resolveProductImageSrc } from "@/lib/product-photo";
import { useLocalizedPrice } from "@/lib/hooks/use-localized-price";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const seedProduct = getMarketplaceProductBySlug(slug ?? "");
  // Admin-added products live only in Supabase, not the static seed catalog
  // — fall back to an async DB lookup so their detail pages actually work
  // once linked to from the marketplace grid.
  const [dbProduct, setDbProduct] = useState<MarketplaceProduct | null>(null);
  const [dbChecked, setDbChecked] = useState(false);
  useEffect(() => {
    if (seedProduct || !slug) { setDbChecked(true); return; }
    let mounted = true;
    fetchProductBySlug(slug).then((p) => { if (mounted) { setDbProduct(p); setDbChecked(true); } });
    return () => { mounted = false; };
  }, [slug, seedProduct]);

  const product = seedProduct ?? dbProduct;
  // Called unconditionally, before the early returns below -- Rules of
  // Hooks. NaN when there's no product yet, which useLocalizedPrice
  // treats the same as "nothing precise to convert" and returns null for.
  const localizedEstimate = useLocalizedPrice(product ? (product.sale_price_cents ?? (product.price_range ? NaN : product.price_cents)) : NaN);

  if (!product) {
    if (!dbChecked) {
      return (
        <PageShell>
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        </PageShell>
      );
    }
    return (
      <PageShell>
        <div className="py-16 text-center">
          <h1 className="font-serif text-2xl font-bold text-givit-ink">Product not found</h1>
          <p className="mt-2 text-muted-foreground">This product may have been removed or the URL is incorrect.</p>
          <Button asChild className="mt-6 rounded-full bg-givit-ember text-white">
            <Link href="/products">Shop marketplace</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const stats = MARKETPLACE_RATINGS.get(product.id);
  const avg = stats?.avg_rating != null ? Number.parseFloat(String(stats.avg_rating)) : 4.8;
  const reviewCount = stats?.review_count ?? 0;
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  const mainSrc = resolveProductImageSrc(product.id, images, product.category?.slug);
  const displayPrice = product.sale_price_cents ? formatMoney(product.sale_price_cents) : product.price_range ?? formatMoney(product.price_cents);
  const related = getRelatedMarketplaceProducts(product);
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);

  return (
    <PageShell wide>
      <RecentlyViewedTracker item={{ slug: product.slug, name: product.name, href: `/products/${product.slug}`, image: mainSrc, price: displayPrice }} />
      <Breadcrumbs>
        <Link href="/home" className="givit-link">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/products" className="givit-link">Marketplace</Link>
        {product.category ? (
          <>
            <span className="mx-1.5">›</span>
            <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="givit-link">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span className="mx-1.5">›</span>
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </Breadcrumbs>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-givit-sand">
            <img src={mainSrc} alt={product.name} onError={(event) => { event.currentTarget.src = productPhotoFallback(product.id, product.category?.slug); }} className="h-full w-full object-cover" />
            {product.tested_badge ? (
              <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-givit-ember shadow-sm">
                {product.tested_badge}
              </div>
            ) : null}
            {product.sale_price_cents ? (
              <div className="absolute right-4 top-4 rounded-full bg-black/85 px-3 py-1 font-mono text-xs font-bold text-givit-coral shadow-sm backdrop-blur-sm">
                -{Math.round((1 - product.sale_price_cents / product.price_cents) * 100)}%
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            {product.category ? (
              <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="text-xs font-bold uppercase tracking-widest text-givit-ember hover:underline">
                {product.category.name}
              </Link>
            ) : null}
            <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-givit-ink md:text-3xl">{product.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StarRating value={avg} count={reviewCount} />
              {product.category_rank != null && product.category_rank <= 10 && (
                <Badge className="rounded-full bg-givit-ember/10 text-givit-ember">
                  <Trophy className="mr-1 h-3 w-3" />
                  #{product.category_rank} in {product.category?.name ?? "Marketplace"}
                </Badge>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold text-givit-ember">{displayPrice}</span>
              {product.sale_price_cents ? (
                <span className="text-sm text-muted-foreground line-through">{formatMoney(product.price_cents)}</span>
              ) : null}
              {product.brand ? <span className="text-sm text-muted-foreground">by {product.brand}</span> : null}
              {localizedEstimate && <span className="w-full text-xs text-muted-foreground">{localizedEstimate} · charged in USD</span>}
            </div>
            {product.ships_in_days ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Ships in ~{product.ships_in_days} day{product.ships_in_days === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-givit-sand/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-givit-ember">
              <Sparkles className="h-3.5 w-3.5" /> Editorial pick
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground">{product.ai_summary}</p>
            {product.why_we_picked_it ? (
              <p className="mt-2 text-sm italic leading-6 text-muted-foreground">"{product.why_we_picked_it}"</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.occasions.map((o) => (
              <span key={o} className="tag-pill capitalize">{o}</span>
            ))}
          </div>

          <div className="grid gap-3">
            {product.retailer === "Admin sourced" ? (
              // These are concierge-fulfilled experiences (a pottery class, a
              // dinner credit) with no single bookable product page — linking
              // out to a placeholder URL would just be a dead link. Route the
              // request into GIVIT AI/concierge instead of pretending there's
              // a retailer to "shop at".
              <Button asChild className="h-12 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
                <Link href={`/gift?q=${encodeURIComponent(`I'd like to book: ${product.name}`)}`}>
                  <Sparkles className="h-4 w-4" /> Request this experience
                </Link>
              </Button>
            ) : product.affiliate_url ? (
              <Button
                asChild
                className="h-12 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover"
              >
                <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Shop at {product.retailer ?? "retailer"}
                </a>
              </Button>
            ) : null}
            {product.video_url ? (
              <Button asChild variant="outline" className="h-12 rounded-full">
                <a href={product.video_url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 fill-current" /> Watch video
                </a>
              </Button>
            ) : null}
            <WishlistButton
              item={{ slug: product.slug, name: product.name, href: `/products/${product.slug}`, image: mainSrc, price: displayPrice }}
            />
            <Button
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href).catch(() => {});
                }
              }}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            No brand deals. Rankings are editorially curated.
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="related">Related gifts</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <div className="givit-section prose prose-sm max-w-none">
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description}</p>
              {product.interests.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-givit-ink">Good for interests:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.interests.map((i) => <span key={i} className="tag-pill capitalize">{i}</span>)}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-4">
            <div className="givit-section">
              <GiftReviews productId={product.id} />
            </div>
          </TabsContent>
          <TabsContent value="related" className="mt-4">
            {related.length > 0 ? (
              <ProductGrid products={related} ratings={ratings} compact />
            ) : (
              <p className="text-sm text-muted-foreground">No related gifts found.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-8">
        <RecentlyViewedRail compact />
      </div>
    </PageShell>
  );
}
