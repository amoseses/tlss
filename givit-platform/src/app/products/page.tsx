import Link from "next/link";
import { Bookmark, Compass, Search, SlidersHorizontal, Sparkles, Trophy } from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
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
  searchParams: Promise<{ category?: string; q?: string; sort?: string; occasion?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const categorySlug = sp.category?.trim() || undefined;
  const q = sp.q?.trim() || undefined;
  const occasion = sp.occasion?.trim().toLowerCase() || undefined;

  const categories = MARKETPLACE_CATEGORIES;
  const list = getMarketplaceProducts({ categorySlug, q }).filter((product) => {
    if (!occasion) return true;
    return product.occasions.some((item) => item.toLowerCase().includes(occasion));
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

      <section className="mb-6 overflow-hidden rounded-3xl bg-givit-ink p-6 text-white md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <Badge className="mb-4 rounded-full bg-givit-ember/20 text-givit-coral">
              <Trophy className="mr-1 h-3.5 w-3.5" /> Admin-ranked free marketplace
            </Badge>
            <h1 className="font-serif text-3xl font-bold md:text-5xl">
              Browse the best gifts without brand deals steering the list.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Givit works like a discovery marketplace: search products, categories, interests, and occasions; save ideas to a wishlist; then click through to the original retailer when you are ready to buy. No cart or shipping flow needed here.
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
              <h2 className="text-sm font-bold text-givit-ink">SEO occasion pages</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {OCCASIONS.map((item) => (
                  <Link
                    key={item}
                    href={`/products?occasion=${encodeURIComponent(item.toLowerCase())}`}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-givit-ember hover:text-givit-ember"
                  >
                    {item}
                  </Link>
                ))}
              </div>
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
            </p>
            <Link href="/gift" className="inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
              <Sparkles className="h-4 w-4" /> AI gift finder coming next
            </Link>
          </div>

          <div className="givit-section">
            {list.length > 0 ? (
              <ProductGrid products={list} ratings={ratings} compact />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No products match your filters. <Link href="/products" className="givit-link">Clear filters</Link>
              </p>
            )}
          </div>

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
