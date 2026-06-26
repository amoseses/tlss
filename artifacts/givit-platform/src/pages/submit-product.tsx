import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ExternalLink, Gift, Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { submitProduct } from "@/lib/supabase/db";
import { inferProductFromUrl } from "@/lib/product-url-ai";

export default function SubmitProductPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleUrlChange(value: string) {
    setUrl(value);
    const draft = inferProductFromUrl(value);
    if (draft.name && !name) setName(draft.name);
    if (draft.brand && !brand) setBrand(draft.brand);
    if (draft.description && !description) setDescription(draft.description);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { setError("Product URL is required"); return; }
    setLoading(true);
    setError("");

    try {
      const { error: submitError } = await submitProduct({
        url: url.trim(),
        name: name.trim() || null,
        brand: brand.trim() || null,
        price_cents: price ? Math.round(parseFloat(price) * 100) : null,
        description: description.trim() || null,
        user_id: user?.id ?? null,
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
          <h2 className="mt-4 font-serif text-2xl font-bold text-givit-ink">Product submitted!</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Our admin team will review your submission and approve it if it meets our quality standards. You'll be notified when it's live.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Link href="/products">Browse marketplace</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg">
              <Link href="/submit-product">Submit another</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-givit-ink">Submit a product</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Found a great gift idea? Submit a link and the AI will draft product details before an admin approves it for the marketplace.
        </p>
      </div>

      <div className="givit-panel p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Product URL <span className="text-givit-ember">*</span>
            </label>
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.amazon.com/product/..."
              required
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">Product name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name (optional)"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-semibold text-foreground">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand name (optional)"
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
              placeholder="Tell us about the product (optional)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-givit-ember text-white hover:bg-givit-ember-hover"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="h-4 w-4" /> Submit for review</>
            )}
          </Button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/10 to-amber-100/40 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-givit-ink">Why submit products?</h2>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
              <li>✓ Help other shoppers discover great gifts</li>
              <li>✓ Your submissions make the marketplace better</li>
              <li>✓ Paste a URL and AI drafts the name, brand, description, and gift metadata</li>
              <li>✓ Approved products get the Givit AI treatment</li>
              <li>✓ You'll earn recognition as a contributor</li>
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
  );
}