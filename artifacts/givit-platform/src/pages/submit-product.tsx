import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, ExternalLink, Gift, Loader2, Plus, Send, Sparkles, Ticket, X, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { submitProduct, findDuplicateProductByUrl } from "@/lib/supabase/db";
import { extractProductFromUrl, normalizeProductUrl, bestProductImageUrl } from "@/lib/admin/imported-products";
import { getAllMarketplaceProducts } from "@/lib/data/marketplace";

type ItemType = "product" | "experience";

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function SubmitProductPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [itemType, setItemType] = useState<ItemType>("product");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [duplicate, setDuplicate] = useState<{ name: string; source: "approved" | "pending" | "catalog" } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const debouncedUrl = useDebounced(url.trim(), 500);

  // Duplicate check: static catalog first (instant), then the live DB
  // (already-approved products + other people's pending submissions).
  useEffect(() => {
    if (!debouncedUrl) { setDuplicate(null); return; }
    let cancelled = false;
    let normalized: string;
    try {
      normalized = normalizeProductUrl(debouncedUrl);
    } catch {
      setDuplicate(null);
      return;
    }

    const catalogMatch = getAllMarketplaceProducts().find((p) => p.affiliate_url === normalized);
    if (catalogMatch) {
      setDuplicate({ name: catalogMatch.name, source: "catalog" });
      return;
    }

    setCheckingDuplicate(true);
    findDuplicateProductByUrl(normalized)
      .then((match) => { if (!cancelled) setDuplicate(match ? { ...match } : null); })
      .catch(() => { if (!cancelled) setDuplicate(null); })
      .finally(() => { if (!cancelled) setCheckingDuplicate(false); });
    return () => { cancelled = true; };
  }, [debouncedUrl]);

  const aiExtracted = useMemo(() => {
    if (!debouncedUrl) return null;
    try {
      return extractProductFromUrl(normalizeProductUrl(debouncedUrl), { name, brand, price, description, category: itemType === "experience" ? "experiences" : "", url: debouncedUrl });
    } catch {
      return null;
    }
  }, [debouncedUrl, name, brand, price, description, itemType]);

  const previewName = name.trim() || aiExtracted?.name || (itemType === "experience" ? "Your experience name" : "Your product name");
  const previewBrand = brand.trim() || aiExtracted?.brand || (itemType === "experience" ? "Local provider" : "Brand");
  const previewPrice = price.trim() ? `$${Number.parseFloat(price).toFixed(2)}` : aiExtracted ? `$${Number.parseFloat(aiExtracted.price).toFixed(2)}` : "$—";
  const previewImage = debouncedUrl ? bestProductImageUrl(debouncedUrl) : null;
  const previewDescription = description.trim() || (aiExtracted ? `${itemType === "experience" ? "Experience" : "Gift idea"} sourced from ${aiExtracted.brand}. Admins can edit before approval.` : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { navigate("/login?next=/submit-product"); return; }
    if (!url.trim()) { setError("Product URL is required"); return; }
    if (duplicate) { setError(`This looks like it might already be in Givit ("${duplicate.name}"). Double-check before resubmitting, or edit the details if this is actually different.`); return; }
    setLoading(true);
    setError("");

    try {
      const normalizedUrl = normalizeProductUrl(url.trim());
      const aiExtracted = extractProductFromUrl(normalizedUrl, {
        name,
        brand,
        price,
        description,
        category: itemType === "experience" ? "experiences" : "",
        url,
      });
      const { error: submitError } = await submitProduct({
        url: normalizedUrl,
        name: name.trim() || aiExtracted.name,
        brand: brand.trim() || aiExtracted.brand,
        price_cents: price ? Math.round(parseFloat(price) * 100) : Math.round(parseFloat(aiExtracted.price) * 100),
        description: description.trim() || `AI scraped summary for ${aiExtracted.name} from ${aiExtracted.brand}. Admins can edit before approval.`,
        category: itemType === "experience" ? "experiences" : aiExtracted.category,
        image_url: bestProductImageUrl(normalizedUrl),
        scraped_metadata: {
          source: "client_ai_product_page_scraper",
          itemType,
          productPageImageUrl: bestProductImageUrl(normalizedUrl),
          extractedAt: new Date().toISOString(),
          aiSummary: `AI scraped ${aiExtracted.name}, categorized it as ${itemType === "experience" ? "an experience" : aiExtracted.category}, and prepared it for admin approval.`,
        },
        user_id: user.id,
        status: "pending",
      });
      if (submitError) { setError(submitError.message); return; }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit product");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <PageShell narrow>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold text-givit-ink">Product added for review!</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Our admin team will review your submission and approve it if it meets our quality standards. You'll be notified when it's live.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Link href="/products">Browse marketplace</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg">
              <Link href="/submit-product">Add another</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-givit-ink">Add your own product or experience</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Found a great gift idea? Paste the link; Givit AI fills in the details and shows you exactly what the card will look like before it's queued for admin approval.
        </p>
      </div>

      {!user && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-givit-ember/20 bg-givit-ember/5 px-4 py-3">
          <p className="text-sm text-foreground">Sign in to submit a product — you can fill out the form and preview it first.</p>
          <Button asChild size="sm" className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/login?next=/submit-product">Log in</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="givit-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">What are you adding?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setItemType("product")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${itemType === "product" ? "border-givit-ember bg-givit-ember/10 text-givit-ink" : "border-border text-muted-foreground hover:border-givit-ember/40"}`}
                >
                  <Gift className="h-4 w-4" /> Physical product
                </button>
                <button
                  type="button"
                  onClick={() => setItemType("experience")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${itemType === "experience" ? "border-givit-ember bg-givit-ember/10 text-givit-ink" : "border-border text-muted-foreground hover:border-givit-ember/40"}`}
                >
                  <Ticket className="h-4 w-4" /> Experience
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">
                {itemType === "experience" ? "Booking / listing URL" : "Product URL"} <span className="text-givit-ember">*</span>
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={itemType === "experience" ? "https://www.airbnb.com/experiences/..." : "https://www.amazon.com/product/..."}
                required
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
              />
              {checkingDuplicate && <p className="text-xs text-muted-foreground">Checking if this is already in Givit…</p>}
              {duplicate && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    This link looks like it might already be in Givit — <strong>{duplicate.name}</strong> ({duplicate.source === "catalog" ? "in the marketplace" : duplicate.source === "approved" ? "already approved" : "pending review from someone else"}). You can still submit if this is genuinely different.
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-foreground">{itemType === "experience" ? "Experience name" : "Product name"}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Auto-filled from URL if left blank"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-foreground">{itemType === "experience" ? "Provider" : "Brand"}</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Auto-filled from URL if left blank"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold text-foreground">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="29.99"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={itemType === "experience" ? "Tell us about the experience (optional)" : "Tell us about the product (optional)"}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-givit-ember text-white hover:bg-givit-ember-hover"
            >
              {!user ? (
                <>Log in to submit</>
              ) : loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="h-4 w-4" /> Add for review</>
              )}
            </Button>
          </form>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Card preview</p>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card p-2 shadow-sm">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-givit-sand">
              {previewImage ? (
                <img src={previewImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  {itemType === "experience" ? <Ticket className="h-10 w-10" /> : <Gift className="h-10 w-10" />}
                </div>
              )}
              <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-givit-ember shadow-sm">
                Pending review
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1 px-0.5">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{previewName}</p>
              {previewDescription && <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{previewDescription}</p>}
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3" /> No ratings yet</div>
              <div className="mt-auto pt-1.5">
                <p className="price-tag text-base font-bold tabular-nums text-givit-ember">{previewPrice}</p>
                <p className="text-[10px] text-muted-foreground">{previewBrand}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">This is exactly how it'll look in the marketplace once approved.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/15 to-givit-coral/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-givit-ink">Why add your own products?</h2>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
              <li>✓ Help other shoppers discover great gifts and experiences</li>
              <li>✓ Your submissions make the marketplace better</li>
              <li>✓ AI checks for duplicates and fills in the details from the link</li>
              <li>✓ You'll earn recognition as a contributor</li>
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
  );
}