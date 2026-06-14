import Link from "next/link";
import { Bookmark, Compass, Search, SlidersHorizontal, Sparkles, Trophy } from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
import { ProductGrid } from "@/components/product/product-grid";
import { WishlistRail } from "@/components/product/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GIFT_COLLECTIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_RATINGS,
  getMarketplaceProducts,
} from "@/lib/data/marketplace";

const OCCASIONS = [
  "Christmas",
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  "Graduation",
  "Baby Shower",
  "Wedding",
  "Anniversary",
  "Retirement",
];

type Props = {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; occasion?: string; min?: string; max?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const categorySlug = sp.category?.trim() || undefined;
  const q = sp.q?.trim() || undefined;
  const occasion = sp.occasion?.trim().toLowerCase() || undefined;
  const minPrice = Number.parseFloat(sp.min ?? "");
  const maxPrice = Number.parseFloat(sp.max ?? "");
  const minCents = Number.isFinite(minPrice) && minPrice > 0 ? Math.round(minPrice * 100) : undefined;
  const maxCents = Number.isFinite(maxPrice) && maxPrice > 0 ? Math.round(maxPrice * 100) : undefined;

  const categories = MARKETPLACE_CATEGORIES;
  const list = getMarketplaceProducts({ categorySlug, q }).filter((product) => {
    if (occasion && !product.occasions.some((item) => item.toLowerCase().includes(occasion))) return false;
    if (minCents && product.price_cents < minCents) return false;
    if (maxCents && product.price_cents > maxCents) return false;
    return true;
  });

  if (sp.sort === "price_asc") list.sort((a, b) => a.price_cents - b.price_cents);
  else if (sp.sort === "price_desc") list.sort((a, b) => b.price_cents - a.price_cents);
  else if (sp.sort === "popular") list.sort((a, b) => b.gift_match_score - a.gift_match_score);
  else list.sort((a, b) => a.rank - b.rank);

  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <PageShell wide>
      <Breadcrumbs>
        <Link href="/" className="givit-link">
          Home
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">Marketplace</span>
        {activeCategory ? (
          <>
            <span className="mx-1.5">›</span>
            <span className="text-foreground">{activeCategory.name}</span>
          </>
        ) : null}
      </Breadcrumbs>

      <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-givit-ember via-rose-500 to-amber-400 p-6 text-white shadow-xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <Badge className="mb-4 rounded-full bg-givit-ember/20 text-givit-coral">
              <Trophy className="mr-1 h-3.5 w-3.5" /> Gift-first marketplace
            </Badge>
            <h1 className="font-serif text-3xl font-bold md:text-5xl">
              Find brighter, better gifts fast.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Search by recipient, occasion, budget, or category. Save favorites and jump to the retailer when you are ready.
            </p>
            <form action="/products" className="mt-6 flex max-w-2xl overflow-hidden rounded-full bg-white text-givit-ink shadow-xl">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search pens, gamers, teachers, coffee, travel..."
                className="min-w-0 flex-1 px-5 py-3 text-sm outline-none"
              />
              <Button type="submit" className="m-1 rounded-full bg-givit-ember px-5 text-white hover:bg-givit-ember-hover">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-givit-coral">
              <Bookmark className="h-4 w-4" /> Your wishlist
            </div>
            <div className="mt-3">
              <WishlistRail />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="givit-section sticky top-36 space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-givit-ink">
                <Compass className="h-4 w-4 text-givit-ember" /> Departments
              </h2>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <Link href="/products" className={cnLink(!categorySlug)}>
                    All categories
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                      className={cnLink(categorySlug === c.slug)}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-bold text-givit-ink">Product filters</h2>
              <form method="get" className="mt-3 space-y-3">
                {q ? <input type="hidden" name="q" value={q} /> : null}
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-givit-ink" htmlFor="side-occasion">Occasion</label>
                  <select id="side-occasion" name="occasion" defaultValue={occasion ?? ""} className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Any occasion</option>
                    {OCCASIONS.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-bold text-givit-ink" htmlFor="side-min">Min $</label>
                    <input id="side-min" name="min" inputMode="decimal" defaultValue={sp.min ?? ""} className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-bold text-givit-ink" htmlFor="side-max">Max $</label>
                    <input id="side-max" name="max" inputMode="decimal" defaultValue={sp.max ?? ""} className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
                <input type="hidden" name="category" value={categorySlug ?? ""} />
                <input type="hidden" name="sort" value={sp.sort ?? "ranked"} />
                <Button type="submit" className="w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">Apply filters</Button>
                <Link href="/products" className="block text-center text-xs font-semibold text-givit-ember hover:underline">Clear all filters</Link>
              </form>
            </div>
          </div>
        </aside>

        <div>
          <div className="givit-section mb-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-givit-ink">
              <SlidersHorizontal className="h-4 w-4 text-givit-ember" /> Filter the marketplace
            </div>
            <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {q ? <input type="hidden" name="q" value={q} /> : null}
              {occasion ? <input type="hidden" name="occasion" value={occasion} /> : null}
              {sp.min ? <input type="hidden" name="min" value={sp.min} /> : null}
              {sp.max ? <input type="hidden" name="max" value={sp.max} /> : null}
              <div className="grid gap-1.5 sm:w-48">
                <label className="text-xs font-bold text-givit-ink" htmlFor="category">
                  Category
                </label>
                <select id="category" name="category" defaultValue={categorySlug ?? ""} className="border-input bg-background h-10 w-full rounded-sm border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 md:w-48">
                <label className="text-xs font-bold text-givit-ink" htmlFor="sort">
                  Sort by
                </label>
                <select id="sort" name="sort" defaultValue={sp.sort ?? "ranked"} className="border-input bg-background h-10 w-full rounded-sm border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="ranked">Admin ranking</option>
                  <option value="popular">Gift match score</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              <Button type="submit" className="h-10 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90">
                Apply
              </Button>
            </form>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <span className="font-semibold text-givit-ink">{list.length} ranked gift ideas</span>
              {q ? <span className="text-muted-foreground"> for &ldquo;{q}&rdquo;</span> : null}
              {occasion ? <span className="text-muted-foreground"> for {occasion}</span> : null}
              {minCents || maxCents ? <span className="text-muted-foreground"> within budget</span> : null}
            </p>
            <Link href="/gift" className="inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
              <Sparkles className="h-4 w-4" /> Ask Givit AI
            </Link>
          </div>

          <div className="givit-section">
            {list.length > 0 ? (
              <ProductGrid products={list} ratings={ratings} compact rankContext={q ? { query: q } : activeCategory ? { categoryName: activeCategory.name } : undefined} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No products match your filters. <Link href="/products" className="givit-link">Clear filters</Link>
              </p>
            )}
          </div>

          <div className="mt-6"><RecentlyViewedRail compact /></div>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {GIFT_COLLECTIONS.map((collection) => (
              <Link key={collection.slug} href={`/products?q=${encodeURIComponent(collection.query)}`} className="rounded-3xl border border-border/70 bg-white p-5 transition hover:-translate-y-0.5 hover:border-givit-ember/40 hover:shadow-md">
                <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Gift board</p>
                <h3 className="mt-2 font-serif text-xl font-bold text-givit-ink">{collection.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{collection.description}</p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function cnLink(active: boolean) {
  return active ? "font-semibold text-primary" : "text-foreground hover:text-givit-ember hover:underline";
}
