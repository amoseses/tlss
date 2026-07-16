import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Bookmark,
  Compass,
  Search,
  SlidersHorizontal,
  Sparkles,
  Cpu,
  Gamepad2,
  Home as HomeIcon,
  ChefHat,
  BookOpen,
  PenTool,
  Flower2,
  Trees,
  Dumbbell,
  PawPrint,
  Palette,
  Cookie,
  Ticket,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

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
  type MarketplaceProduct,
} from "@/lib/data/marketplace";
import { fetchAdminProducts } from "@/lib/data/data-layer";
import { useSearchParams } from "@/lib/hooks/use-search-params";

const OCCASIONS = [
  "Christmas", "Valentine's Day", "Mother's Day", "Father's Day",
  "Graduation", "Baby Shower", "Wedding", "Anniversary", "Retirement",
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tech: Cpu,
  gaming: Gamepad2,
  home: HomeIcon,
  kitchen: ChefHat,
  books: BookOpen,
  writing: PenTool,
  beauty: Flower2,
  outdoor: Trees,
  fitness: Dumbbell,
  pets: PawPrint,
  art: Palette,
  food: Cookie,
  experiences: Ticket,
};

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

  // Admin-managed products live in Supabase (real backend, not localStorage)
  // — fetched once and merged in on top of the static seed catalog so they
  // show up in the real marketplace, not just the admin dashboard.
  const [adminProducts, setAdminProducts] = useState<MarketplaceProduct[]>([]);
  useEffect(() => {
    let mounted = true;
    fetchAdminProducts().then((products) => { if (mounted) setAdminProducts(products); });
    return () => { mounted = false; };
  }, []);

  const seedList = getMarketplaceProducts({ categorySlug, q });
  const adminList = adminProducts.filter((product) => {
    if (categorySlug && product.category?.slug !== categorySlug) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    const haystack = [product.name, product.brand, product.retailer, product.ai_summary, product.why_we_picked_it, ...product.interests]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(needle);
  });
  const bySlug = new Map(seedList.map((p) => [p.slug, p]));
  for (const p of adminList) bySlug.set(p.slug, p);

  const list = Array.from(bySlug.values()).filter((product) => {
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

  function cnPill(active: boolean) {
    return active
      ? "givit-gradient text-white shadow-sm"
      : "bg-givit-sand/50 text-foreground hover:bg-givit-sand hover:text-givit-ember";
  }

  // Switching category/search/sort/etc. re-renders this same route with new
  // results, but the grid sits below a tall hero + filter bar — without this,
  // nothing visibly moves and it looks like the click did nothing until you
  // scroll down. Skip the very first render so landing on /products doesn't
  // yank the page.
  const resultsRef = useRef<HTMLDivElement>(null);
  const resultsKey = `${categorySlug ?? ""}|${q ?? ""}|${occasion ?? ""}|${sortVal}|${minStr}|${maxStr}`;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultsKey]);

  return (
    <PageShell wide>
      <Breadcrumbs>
        <Link href="/home" className="givit-link">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">Marketplace</span>
        {activeCategory ? (
          <>
            <span className="mx-1.5">›</span>
            <span className="text-foreground">{activeCategory.name}</span>
          </>
        ) : null}
      </Breadcrumbs>

      <section className="relative mb-6 overflow-hidden rounded-lg bg-black p-6 text-white shadow-xl md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full bg-givit-coral/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-givit-ember/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold md:text-5xl">
              Marketplace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Search by recipient, occasion, budget, or category.
            </p>
            <form action="/products" className="mt-6 flex max-w-2xl overflow-hidden rounded-md bg-card text-givit-ink shadow-xl">
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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        <Link
          href="/products"
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${cnPill(!categorySlug)}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> All
        </Link>
        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
          return (
            <Link
              key={c.id}
              href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${cnPill(categorySlug === c.slug)}`}
            >
              <Icon className="h-3.5 w-3.5" /> {c.name}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="givit-section sticky top-36 space-y-6">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-givit-ink">
                <Compass className="h-4 w-4 text-givit-ember" /> Departments
              </h2>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link
                    href="/products"
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${cnPill(!categorySlug)}`}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" /> All categories
                  </Link>
                </li>
                {categories.map((c) => {
                  const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${cnPill(categorySlug === c.slug)}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" /> {c.name}
                      </Link>
                    </li>
                  );
                })}
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
                  <option value="ranked">Givit ranked</option>
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
                  className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-givit-ember/40 hover:bg-givit-sand hover:text-givit-ember"
                >
                  # {tag.label}
                </a>
              ))}
            </div>
          )}

          <div ref={resultsRef} className="scroll-mt-32">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <span className="font-semibold text-givit-ink">{sorted.length} ranked gift ideas</span>
              {q ? <span className="text-muted-foreground"> for "{q}"</span> : null}
              {activeCategory ? <span className="text-muted-foreground"> in {activeCategory.name}</span> : null}
            </p>
            <Link href="/gift" className="inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
              <Sparkles className="h-4 w-4" /> Ask Givit AI
            </Link>
          </div>

          <div key={resultsKey} className="givit-section slide-up">
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
          </div>

          <div className="mt-6"><RecentlyViewedRail compact /></div>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {GIFT_COLLECTIONS.map((collection) => (
              <Link key={collection.slug} href={`/products?q=${encodeURIComponent(collection.query)}`} className="rounded-3xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-givit-ember/40 hover:shadow-md">
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
