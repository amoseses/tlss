import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Share2, ShieldCheck, Sparkles, Trophy } from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { GiftReviews } from "@/components/product/gift-reviews";
import { ProductGrid } from "@/components/product/product-grid";
import { StarRating } from "@/components/product/star-rating";
import { RecentlyViewedRail, RecentlyViewedTracker } from "@/components/personalization/recently-viewed";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MARKETPLACE_RATINGS,
  getMarketplaceProductBySlug,
  getRelatedMarketplaceProducts,
} from "@/lib/data/marketplace";
import { formatMoney } from "@/lib/format";
import { isRemoteImageUrl, resolveProductImageSrc } from "@/lib/product-photo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getMarketplaceProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: `${product.name} | Givit Marketplace`,
    description: product.ai_summary,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getMarketplaceProductBySlug(slug);
  if (!product) notFound();

  const stats = MARKETPLACE_RATINGS.get(product.id);
  const avg = stats?.avg_rating != null ? Number.parseFloat(String(stats.avg_rating)) : 4.8;
  const reviewCount = stats?.review_count ?? 0;
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  const mainSrc = resolveProductImageSrc(product.id, images);
  const displayPrice = product.sale_price_cents ? formatMoney(product.sale_price_cents) : product.price_range ?? formatMoney(product.price_cents);
  const related = getRelatedMarketplaceProducts(product);
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);

  return (
    <PageShell wide>
      <RecentlyViewedTracker item={{ slug: product.slug, name: product.name, href: `/products/${product.slug}`, image: mainSrc, price: displayPrice }} />
      <Breadcrumbs>
        <Link href="/" className="givit-link">Home</Link>
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
      </Breadcrumbs>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="givit-section overflow-hidden">
            <div className="relative aspect-square max-h-[560px] w-full overflow-hidden rounded-3xl bg-givit-sand">
              <Image
                src={mainSrc}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                unoptimized={isRemoteImageUrl(mainSrc)}
              />
              <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-givit-ember shadow-sm">
                #{product.rank} Givit ranked
              </div>
            </div>
          </div>

          <div className="givit-section lg:hidden">
            <ProductInfo product={product} avg={avg} reviewCount={reviewCount} mainSrc={mainSrc} />
          </div>

          <Tabs defaultValue="summary" className="givit-section">
            <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                AI summary
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Gift data
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Reviews ({reviewCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-5 space-y-4 text-sm leading-7">
              <div className="rounded-2xl bg-givit-sand/60 p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-givit-ink">
                  <Sparkles className="h-4 w-4 text-givit-ember" /> Givit AI summary
                </div>
                <p className="text-muted-foreground">{product.ai_summary}</p>
              </div>
              <div>
                <h2 className="font-semibold text-givit-ink">Why we picked it</h2>
                <p className="mt-2 text-muted-foreground">{product.why_we_picked_it}</p>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </TabsContent>
            <TabsContent value="details" className="mt-5 grid gap-4 md:grid-cols-3">
              <GiftTag title="Interests" values={product.interests} />
              <GiftTag title="Occasions" values={product.occasions} />
              <GiftTag title="Recipients" values={product.recipients} />
            </TabsContent>
            <TabsContent value="reviews" className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border/70 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StarRating value={avg} count={reviewCount} />
                  <Badge variant="outline">Aggregated marketplace signal</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Givit&apos;s free marketplace does not sell inventory directly. Review count and score represent the curated signal Givit uses to rank items, combining customer sentiment, durability, usefulness, and gift fit.
                </p>
              </div>
              <GiftReviews productId={product.id} />
            </TabsContent>
          </Tabs>

          <RecentlyViewedRail />

          {related.length > 0 ? (
            <section className="givit-section">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-givit-ink">Related gifts</h2>
                  <p className="text-sm text-muted-foreground">Alternatives with overlapping interests, occasions, or categories.</p>
                </div>
                <Link href="/products" className="givit-link text-sm font-semibold">Browse all</Link>
              </div>
              <ProductGrid products={related} ratings={ratings} compact />
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="givit-section sticky top-36">
            <ProductInfo product={product} avg={avg} reviewCount={reviewCount} mainSrc={mainSrc} />
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function ProductInfo({
  product,
  avg,
  reviewCount,
  mainSrc,
}: {
  product: NonNullable<ReturnType<typeof getMarketplaceProductBySlug>>;
  avg: number;
  reviewCount: number;
  mainSrc: string;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge className="rounded-full bg-givit-ember text-white"><Trophy className="mr-1 h-3.5 w-3.5" /> Rank #{product.rank}</Badge>
        <Badge variant="outline" className="rounded-full"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {product.tested_badge}</Badge>
      </div>

      <h1 className="mt-4 text-3xl leading-snug font-bold text-givit-ink">{product.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{product.brand} · sold by {product.retailer}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StarRating value={avg} count={reviewCount} />
        <span className="rounded-full bg-givit-sand px-2 py-1 text-xs font-bold text-givit-ember">
          Gift Match Score: {product.gift_match_score}/100
        </span>
      </div>

      <Separator className="my-5" />

      <div>
        <p className="text-sm text-muted-foreground">Typical price range</p>
        <div className="flex flex-wrap items-end gap-2">
          <p className="price-deal text-3xl tabular-nums">{product.sale_price_cents ? formatMoney(product.sale_price_cents) : product.price_range}</p>
          {product.sale_price_cents ? <p className="pb-1 text-sm text-muted-foreground line-through">{formatMoney(product.price_cents)}</p> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Approx. {formatMoney(product.price_cents)} · final price is set by the retailer.</p>
      </div>

      <div className="mt-5 grid gap-2">
        <Button asChild className="h-11 w-full rounded-sm bg-givit-ember font-semibold text-white hover:bg-givit-ember-hover">
          <a href={product.affiliate_url} target="_blank" rel="noopener noreferrer sponsored">
            Buy from {product.retailer} <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <WishlistButton
          item={{
            slug: product.slug,
            name: product.name,
            href: `/products/${product.slug}`,
            image: mainSrc,
            price: product.price_range,
          }}
        />
        <Button asChild variant="outline" className="h-10 w-full rounded-sm">
          <a href={`mailto:?subject=${encodeURIComponent(`Gift idea: ${product.name}`)}&body=${encodeURIComponent(`I saved this Givit gift idea for you: /products/${product.slug}`)}`}>
            <Share2 className="h-4 w-4" /> Share gift idea
          </a>
        </Button>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl bg-givit-sand/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-givit-ink">Free marketplace promise</p>
        <p>✓ No direct checkout, no shipping friction</p>
        <p>✓ Link goes to the original retailer</p>
        <p>✓ Admin-controlled rankings and product edits</p>
      </div>
    </>
  );
}

function GiftTag({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <h3 className="font-semibold text-givit-ink">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <Link key={value} href={`/products?q=${encodeURIComponent(value)}`} className="rounded-full bg-givit-sand px-3 py-1 text-xs font-medium text-givit-ink hover:text-givit-ember">
            {value}
          </Link>
        ))}
      </div>
    </div>
  );
}
