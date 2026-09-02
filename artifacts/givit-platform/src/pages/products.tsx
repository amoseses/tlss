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
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumbs, PageShell } from "@/components/layout/page-shell";
import { RecentlyViewedRail } from "@/components/personalization/recently-viewed";
import { ProductCard } from "@/components/product/product-card";
import { ProductGrid } from "@/components/product/product-grid";
import { WishlistRail } from "@/components/product/wishlist-button";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/count-up";
import {
  GIFT_COLLECTIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_RATINGS,
  getMarketplaceProducts,
  type MarketplaceProduct,
} from "@/lib/data/marketplace";
import { fetchAdminProducts } from "@/lib/data/data-layer";
import { useSearchParams } from "@/lib/hooks/use-search-params";
import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { formatMoney } from "@/lib/format";
import { initials } from "@/lib/utils";

// Pulled from the actual `occasions` tags present in the product catalog
// (verified by grepping marketplace.ts), not guessed -- the previous list
// was missing "Birthday" entirely (the single most common gift occasion)
// while including "Valentine's Day", which no product in the seed catalog
// is actually tagged with, so that option silently always returned zero
// results.
const OCCASIONS = [
  "Birthday", "Anniversary", "Wedding", "Baby Shower", "New Baby", "Graduation",
  "Christmas", "Holiday", "Diwali", "Mother's Day", "Father's Day", "Housewarming",
  "New Job", "Promotion", "Retirement", "Thank You", "Secret Santa", "White Elephant",
  "Stocking Stuffer", "Goodbye Gift", "Travel",
];

// The catalog doesn't carry a per-product age rating (nothing to filter on
// there without inventing data), but it does carry real `recipients` life-
// stage tags ("kid", "college student", "grandparent", ...) -- verified
// present in marketplace.ts the same way OCCASIONS was. Age buckets map
// onto those genuine tags instead of a fabricated field. No "Adults"
// bucket: with no adult-specific tag to filter on, that option would be
// identical to "Any age," which is already the default.
const AGE_GROUPS: { value: string; label: string }[] = [
  { value: "kid", label: "Kids" },
  { value: "student", label: "Teens & students" },
  { value: "parent", label: "Parents" },
  { value: "senior", label: "Grandparents & seniors" },
];
const AGE_GROUP_TAGS: Record<string, string[]> = {
  kid: ["kid"],
  student: ["student", "college student", "graduate"],
  parent: ["parent", "new parent", "busy parent"],
  senior: ["grandparent"],
};

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

type ShoppingForPerson = {
  id: string;
  name: string;
  relationship: string;
  interests: string[];
  avoidTerms: string[];
  budgetCents: number | null;
};

// The occasion/price-range filters have always existed in the underlying
// query logic (?occasion=, ?min=, ?max=) but had no actual control anywhere
// on the page -- reachable only by hand-editing the URL. This is that
// control, shared between the always-visible desktop sidebar and a
// collapsible mobile panel so it's one definition, not two drifting copies.
function MarketplaceFilters({ q, categorySlug, sortVal, occasion, ageGroup, minStr, maxStr }: {
  q?: string;
  categorySlug?: string;
  sortVal: string;
  occasion?: string;
  ageGroup?: string;
  minStr: string;
  maxStr: string;
}) {
  const hasActiveFilters = Boolean(occasion) || Boolean(ageGroup) || Boolean(minStr) || Boolean(maxStr);
  return (
    <form method="get" action="/products" className="space-y-4">
      {q ? <input type="hidden" name="q" value={q} /> : null}
      {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
      <input type="hidden" name="sort" value={sortVal} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-foreground">Occasion</label>
        <select
          name="occasion"
          defaultValue={occasion ?? ""}
          className="h-9 w-full rounded-xl border border-border/50 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
        >
          <option value="">Any occasion</option>
          {OCCASIONS.map((o) => (
            <option key={o} value={o.toLowerCase()}>{o}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-foreground">Recipient's age</label>
        <select
          name="age"
          defaultValue={ageGroup ?? ""}
          className="h-9 w-full rounded-xl border border-border/50 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
        >
          <option value="">Any age</option>
          {AGE_GROUPS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-foreground">Price range</label>
        <div className="flex items-center gap-2">
          <input type="number" name="min" min={0} step={1} defaultValue={minStr} placeholder="Min" className="h-9 w-full rounded-xl border border-border/50 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20" />
          <span className="text-muted-foreground">–</span>
          <input type="number" name="max" min={0} step={1} defaultValue={maxStr} placeholder="Max" className="h-9 w-full rounded-xl border border-border/50 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20" />
        </div>
      </div>

      <button type="submit" className="w-full rounded-full bg-givit-ember py-2 text-xs font-semibold text-white transition hover:bg-givit-ember-hover">
        Apply filters
      </button>
      {hasActiveFilters && (
        <Link
          href={`/products${categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ""}`}
          className="block text-center text-xs font-medium text-muted-foreground hover:text-givit-ember"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}

export default function ProductsPage() {
  const { get } = useSearchParams();
  const categorySlug = get("category") || undefined;
  const q = get("q") || undefined;
  const occasion = get("occasion") || undefined;
  const ageGroup = get("age") || undefined;
  const sortVal = get("sort") || "ranked";
  const minStr = get("min") || "";
  const maxStr = get("max") || "";
  const forId = get("for") || undefined;

  const { user } = useAuth();
  const [savedPeople, setSavedPeople] = useState<ShoppingForPerson[]>([]);
  const [peopleReady, setPeopleReady] = useState(false);
  useEffect(() => {
    if (!user) { setSavedPeople([]); setPeopleReady(true); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setSavedPeople(rows.map((row) => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship || "",
        interests: row.interests ?? [],
        avoidTerms: row.avoid_terms ?? [],
        budgetCents: row.default_budget_cents ?? null,
      })));
      setPeopleReady(true);
    });
    return () => { mounted = false; };
  }, [user]);
  // On the plain default view (no explicit "for", search, or category), a
  // single saved person is an unambiguous shopping context — no reason to
  // make the user click their own name to see it applied. "for=_none" is an
  // explicit opt-out so "Clear" has somewhere to go in that auto case.
  const autoPersonalizable = !forId && !q && !categorySlug;
  const shoppingFor = forId === "_none"
    ? undefined
    : forId
      ? savedPeople.find((p) => p.id === forId)
      : autoPersonalizable && savedPeople.length === 1
        ? savedPeople[0]
        : undefined;
  // While a person context should apply but hasn't loaded yet, the grid
  // would briefly render in generic rank order and then jump into
  // personalized order once the fetch resolves — visible, jarring reflow.
  // Hold off rendering results until we know one way or the other.
  const awaitingPersonalization = Boolean(user) && !peopleReady && (Boolean(forId) || autoPersonalizable);

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
    if (ageGroup) {
      const tags = AGE_GROUP_TAGS[ageGroup] ?? [];
      if (tags.length > 0 && !product.recipients.some((r) => tags.includes(r.toLowerCase()))) return false;
    }
    return true;
  });

  const sorted = [...list];
  if (sortVal === "price_asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
  else if (sortVal === "price_desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
  else if (sortVal === "popular") sorted.sort((a, b) => b.gift_match_score - a.gift_match_score);
  else sorted.sort((a, b) => a.rank - b.rank);

  // "Shopping for" reorders toward what's actually known about that person
  // instead of just re-showing the same default rank list. Two people with
  // different interests/relationships/avoid-terms need to visibly diverge,
  // so this scores on several signals rather than one narrow exact-tag
  // match (which silently no-ops, and thus looks identical across people,
  // whenever a saved interest doesn't literally equal a product tag).
  function personalScore(product: MarketplaceProduct, person: ShoppingForPerson) {
    const avoid = person.avoidTerms.map((t) => t.toLowerCase()).filter(Boolean);
    const haystack = [product.name, product.category?.name ?? "", ...product.interests, ...product.recipients]
      .join(" ").toLowerCase();
    if (avoid.some((term) => haystack.includes(term))) return -100;

    let score = 0;
    const interestWords = person.interests.map((i) => i.toLowerCase()).filter(Boolean);
    for (const interest of interestWords) {
      const hit = product.interests.some((tag) => {
        const t = tag.toLowerCase();
        return t === interest || t.includes(interest) || interest.includes(t);
      });
      if (hit) score += 2;
      else if (haystack.includes(interest)) score += 1;
    }
    const relationship = person.relationship.toLowerCase();
    if (relationship && product.recipients.some((r) => r.toLowerCase().includes(relationship) || relationship.includes(r.toLowerCase()))) {
      score += 1;
    }
    if (person.budgetCents) {
      if (product.price_cents <= person.budgetCents) score += 1;
      else score -= 1;
    }
    return score;
  }
  if (shoppingFor) {
    sorted.sort((a, b) => personalScore(b, shoppingFor) - personalScore(a, shoppingFor));

    // Re-ranking alone leaves the same ~82-item count for every person,
    // which reads as no real personalization happening — if we actually
    // know something about them, only keep products with a genuine
    // positive match instead of just reshuffling the full catalog. Falls
    // back to a smaller top-slice (not the full list) when filtering would
    // leave too few to browse, rather than an empty page.
    if (shoppingFor.interests.length > 0) {
      const filtered = sorted.filter((p) => personalScore(p, shoppingFor) > 0);
      const fallbackFill = sorted.filter((p) => !filtered.includes(p)).slice(0, Math.max(0, 24 - filtered.length));
      const next = filtered.length >= 8 ? filtered : [...filtered, ...fallbackFill];
      sorted.length = 0;
      sorted.push(...next);
    }
  }

  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  // A spotlight of a handful of genuinely top-ranked picks up top, distinct
  // in size from the regular grid, so the page reads as curated rather than
  // an undifferentiated e-commerce feed. Only on the unfiltered default view.
  const featuredPicks = !q && !categorySlug ? sorted.slice(0, 3) : [];

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const resultsKey = `${categorySlug ?? ""}|${q ?? ""}|${occasion ?? ""}|${ageGroup ?? ""}|${sortVal}|${minStr}|${maxStr}|${forId ?? ""}`;
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

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-black p-8 text-white shadow-xl md:p-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-givit-coral/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-10 h-72 w-72 rounded-full bg-givit-ember/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
              <span className="text-givit-coral">GIVIT</span>
              <span>EDITORIALLY CURATED</span>
              <span><CountUp value={sorted.length} className="font-mono" /> RESULT{sorted.length === 1 ? "" : "S"}</span>
            </div>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.05] md:text-6xl">
              Marketplace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 md:text-base">
              Search by recipient, occasion, budget, or category.
            </p>
            <form action="/products" className="mt-7 flex max-w-2xl overflow-hidden rounded-full bg-card text-givit-ink shadow-xl">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search pens, gamers, teachers, coffee, travel..."
                className="min-w-0 flex-1 px-6 py-3.5 text-sm outline-none"
              />
              <Button type="submit" className="m-1.5 rounded-full bg-givit-ember px-6 text-white hover:bg-givit-ember-hover">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-semibold text-givit-coral">
              <Bookmark className="h-4 w-4" /> Your wishlist
            </div>
            <div className="mt-3">
              <WishlistRail />
            </div>
          </div>
        </div>
      </section>

      {shoppingFor ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-givit-ember/25 bg-givit-ember/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full givit-gradient text-sm font-bold text-white">
              {initials(shoppingFor.name)}
            </div>
            <p className="text-sm text-givit-ink">
              <span className="font-semibold">Shopping for {shoppingFor.name}</span>
              {shoppingFor.budgetCents ? <span className="text-muted-foreground"> · budget {formatMoney(shoppingFor.budgetCents)}</span> : null}
              {shoppingFor.interests.length > 0 ? <span className="text-muted-foreground"> · loves {shoppingFor.interests.slice(0, 3).join(", ")}</span> : null}
            </p>
          </div>
          <Link
            href={`/products?for=_none${categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : ""}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Link>
        </div>
      ) : savedPeople.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-givit-ember/25 bg-givit-ember/5 px-4 py-3.5">
          <p className="text-sm font-semibold text-givit-ink">Shopping for someone?</p>
          <div className="flex flex-wrap items-center gap-2">
            {savedPeople.map((p) => (
              <Link
                key={p.id}
                href={`/products?for=${encodeURIComponent(p.id)}${categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : ""}`}
                className="flex items-center gap-1.5 rounded-full border border-givit-ember/30 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-givit-ember/60 hover:text-givit-ember"
              >
                <UserRound className="h-3.5 w-3.5" /> {p.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Mobile-only: the vertical "Departments" sidebar below covers this
          exact same category list on desktop (lg+) -- showing both at once
          was pure duplication. This stays for small screens, where the
          sidebar is hidden. */}
      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <div className="flex flex-1 snap-x gap-2 overflow-x-auto pb-1">
          <Link
            href="/products"
            className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${cnPill(!categorySlug)}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> All
          </Link>
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
            return (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${cnPill(categorySlug === c.slug)}`}
              >
                <Icon className="h-3.5 w-3.5" /> {c.name}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowMobileFilters((v) => !v)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${cnPill(showMobileFilters || Boolean(occasion) || Boolean(ageGroup) || Boolean(minStr) || Boolean(maxStr))}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {showMobileFilters && (
        <div className="mb-6 rounded-2xl border border-border/50 bg-card p-4 lg:hidden">
          <MarketplaceFilters q={q} categorySlug={categorySlug} sortVal={sortVal} occasion={occasion} ageGroup={ageGroup} minStr={minStr} maxStr={maxStr} />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-40 space-y-6">
            <div className="space-y-1">
              <h2 className="mb-2 flex items-center gap-2 px-3 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Compass className="h-3.5 w-3.5" /> Departments
              </h2>
              <Link
                href="/products"
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${cnPill(!categorySlug)}`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" /> All categories
              </Link>
              {categories.map((c) => {
                const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
                return (
                  <Link
                    key={c.id}
                    href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${cnPill(categorySlug === c.slug)}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {c.name}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border/40 pt-6">
              <h2 className="mb-3 flex items-center gap-2 px-3 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </h2>
              <div className="px-3">
                <MarketplaceFilters q={q} categorySlug={categorySlug} sortVal={sortVal} occasion={occasion} ageGroup={ageGroup} minStr={minStr} maxStr={maxStr} />
              </div>
            </div>
          </div>
        </aside>

        <div>
          {!q && !categorySlug && featuredPicks.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-givit-ember" />
                <h2 className="font-serif text-lg font-bold text-givit-ink">This week's curated picks</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {featuredPicks.map((p) => {
                  const s = ratings[p.id];
                  const avg = s?.avg_rating != null ? Number.parseFloat(String(s.avg_rating)) : null;
                  return (
                    <ProductCard
                      key={p.id}
                      product={p}
                      images={p.images}
                      avgRating={avg ?? undefined}
                      reviewCount={s?.review_count ?? 0}
                      featured
                      rankLabel={`#${p.category_rank ?? p.rank} in ${p.category?.name ?? "Marketplace"}`}
                      shoppingFor={shoppingFor ? { name: shoppingFor.name, interests: shoppingFor.interests } : undefined}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <div ref={resultsRef} className="scroll-mt-32">
          <div className="mb-3 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background/85 px-1 py-2 text-sm">
            <p>
              <span className="font-semibold text-givit-ink">{sorted.length} ranked gift ideas</span>
              {q ? <span className="text-muted-foreground"> for "{q}"</span> : null}
              {activeCategory ? <span className="text-muted-foreground"> in {activeCategory.name}</span> : null}
              {occasion ? <span className="text-muted-foreground"> · {occasion}</span> : null}
              {ageGroup ? <span className="text-muted-foreground"> · {AGE_GROUPS.find((a) => a.value === ageGroup)?.label.toLowerCase()}</span> : null}
              {minStr || maxStr ? (
                <span className="text-muted-foreground"> · ${minStr || "0"}–{maxStr ? `$${maxStr}` : "any"}</span>
              ) : null}
              {shoppingFor ? <span className="text-muted-foreground"> · sorted for {shoppingFor.name}'s interests</span> : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <form method="get" className="flex items-center gap-2">
                {q ? <input type="hidden" name="q" value={q} /> : null}
                {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  name="sort"
                  defaultValue={sortVal}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="h-8 rounded-full border border-border/40 bg-card px-3 text-xs font-medium text-foreground outline-none"
                >
                  <option value="ranked">GIVIT ranked</option>
                  <option value="popular">Gift match score</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </form>
              <Link href="/gift" className="inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
                <Sparkles className="h-4 w-4" /> Ask Your Gift AI
              </Link>
            </div>
          </div>

          {!q && !categorySlug && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TRENDING_TAGS.map((tag) => (
                <a
                  key={tag.label}
                  href={`/products?q=${encodeURIComponent(tag.q)}`}
                  className="inline-flex items-center rounded-full border border-border/40 bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-givit-ember/40 hover:bg-givit-sand hover:text-givit-ember"
                >
                  # {tag.label}
                </a>
              ))}
            </div>
          )}

          <div key={resultsKey} className="slide-up">
            {awaitingPersonalization ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2 rounded-2xl border border-border/40 bg-card p-3">
                    <div className="aspect-square rounded-xl bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : sorted.length > 0 ? (
              <ProductGrid
                products={featuredPicks.length > 0 ? sorted.slice(featuredPicks.length) : sorted}
                ratings={ratings}
                compact
                rankContext={q ? { query: q } : activeCategory ? { categoryName: activeCategory.name } : undefined}
                shoppingFor={shoppingFor ? { name: shoppingFor.name, interests: shoppingFor.interests } : undefined}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No products match your filters. <Link href="/products" className="givit-link">Clear filters</Link>
              </p>
            )}
          </div>
          </div>

          <div className="mt-6"><RecentlyViewedRail compact /></div>

          <Reveal variant="triangle">
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              {GIFT_COLLECTIONS.map((collection) => (
                <Link key={collection.slug} href={`/products?q=${encodeURIComponent(collection.query)}`} className="rounded-3xl border border-border/70 bg-card p-5 transition hover:-translate-y-0.5 hover:border-givit-ember/40 hover:shadow-md">
                  <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Gift board</p>
                  <h3 className="mt-2 font-serif text-xl font-bold text-givit-ink">{collection.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{collection.description}</p>
                </Link>
              ))}
            </section>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
