import { Link } from "wouter";
import { Bookmark, Compass, Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
import { ProductGrid } from "@/components/product/product-grid";
import { WishlistRail } from "@/components/product/wishlist-button";
import { Button } from "@/components/ui/button";
import {
  GIFT_COLLECTIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_RATINGS,
  getMarketplaceProducts,
} from "@/lib/data/marketplace";
import { useSearchParams } from "@/lib/hooks/use-search-params";

const OCCASIONS = [
  "Christmas", "Valentine's Day", "Mother's Day", "Father's Day",
  "Graduation", "Baby Shower", "Wedding", "Anniversary", "Retirement",
];

const TRENDING_TAGS = [
  { label: "Tech under $150", q: "tech under 150" },
  { label: "Cozy home gifts", q: "cozy home" },
  { label: "Gifts for coffee lovers", q: "coffee" },
  { label: "For the outdoors type", q: "outdoor" },
  { label: "Eco-friendly picks", q: "eco sustainable" },
  { label: "Gifts under $30", q: "under 30" },
  { label: "Bookworm favorites", q: "books reading" },
  { label: "Unique experiences", q: "experiences" },
];

export default function ProductsPage() {
  const { get } = useSearchParams();
  const categorySlug = get("category") || undefined;
  const q = get("q") || undefined;
  const occasion = get("occasion") || undefined;
  const sortVal = get("sort") || "ranked";
  const minStr = get("min") || "";
  const maxStr = get("max") || "";

  const minPrice = Number.parseFloat(minStr);
  const maxPrice = Number.parseFloat(maxStr);
  const minCents = Number.isFinite(minPrice) && minPrice > 0 ? Math.round(minPrice * 100) : undefined;
  const maxCents = Number.isFinite(maxPrice) && maxPrice > 0 ? Math.round(maxPrice * 100) : undefined;

  const categories = MARKETPLACE_CATEGORIES;
  const list = getMarketplaceProducts({ categorySlug, q }).filter((product) => {
    if (occasion && !product.occasions.some((item) => item.toLowerCase().includes(occasion))) return false;
    if (minCents && product.price_cents < minCents) return false;
    if (maxCents && product.price_cents > maxCents) return false;
    return true;
  });

  const sorted = [...list];
  if (sortVal === "price_asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
  else if (sortVal === "price_desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
  else if (sortVal === "popular") sorted.sort((a, b) => b.gift_match_score - a.gift_match_score);
  else sorted.sort((a, b) => a.rank - b.rank);

  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  function cnLink(active: boolean) {
    return active ? "font-semibold text-primary" : "text-foreground hover:text-givit-ember hover:underline";
  }

  return (
    <PageShell wide>
      <Breadcrumbs>
        <Link href="/" className="givit-link">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">Marketplace</span>
        {activeCategory ? (
          <>
            <span className="mx-1.5">›</span>
            <span className="text-foreground">{activeCategory.name}</span>
          </>
        ) : null}
      </Breadcrumbs>

      <section className="mb-6 overflow-hidden rounded-lg bg-gradient-to-br from-givit-ember via-rose-500 to-amber-400 p-6 text-white shadow-xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold md:text-5xl">
              Marketplace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Search by recipient, occasion, budget, or category.
            </p>
            <form action="/products" className="mt-6 flex max-w-2xl overflow-hidden rounded-md bg-white text-givit-ink shadow-xl">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search pens, gamers, teachers, coffee, travel..."
                className="min-w-0 flex-1 px-5 py-3 text-sm outline-none"
              />
              <Button type="submit" className="m-1 rounded-md bg-givit-ember px-5 text-white hover:bg-givit-ember-hover">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5 backdrop-blur">
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
                  <Link href="/products" className={cnLink(!categorySlug)}>All categories</Link>
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
          </div>
        </aside>

        <div>
          <div className="givit-section mb-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-givit-ink">
              <SlidersHorizontal className="h-4 w-4 text-givit-ember" /> Filter the marketplace
            </div>
            <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <div className="grid gap-1.5 sm:w-48">
                <label className="text-xs font-bold text-givit-ink" htmlFor="category">Category</label>
                <select id="category" name="category" defaultValue={categorySlug ?? ""} className="border-input bg-background h-10 w-full rounded-sm border px-3 text-sm outline-none">
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 md:w-48">
                <label className="text-xs font-bold text-givit-ink" htmlFor="sort">Sort by</label>
                <select id="sort" name="sort" defaultValue={sortVal} className="border-input bg-background h-10 w-full rounded-sm border px-3 text-sm outline-none">
                  <option value="ranked">Admin ranking</option>
                  <option value="popular">Gift match score</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              <Button type="submit" className="h-10 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90">Apply</Button>
            </form>
          </div>

          {!q && !categorySlug && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TRENDING_TAGS.map((tag) => (
                <a
                  key={tag.label}
                  href={`/products?q=${encodeURIComponent(tag.q)}`}
                  className="inline-flex items-center rounded-full border border-border/60 bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-givit-ember/40 hover:bg-givit-sand hover:text-givit-ember"
                >
                  # {tag.label}
                </a>
              ))}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <span className="font-semibold text-givit-ink">{sorted.length} ranked gift ideas</span>
              {q ? <span className="text-muted-foreground"> for "{q}"</span> : null}
            </p>
            <Link href="/gift" className="inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
              <Sparkles className="h-4 w-4" /> Ask Givit AI
            </Link>
          </div>

          <div className="givit-section">
            {sorted.length > 0 ? (
              <ProductGrid
                products={sorted}
                ratings={ratings}
                compact
                rankContext={q ? { query: q } : activeCategory ? { categoryName: activeCategory.name } : undefined}
              />
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
