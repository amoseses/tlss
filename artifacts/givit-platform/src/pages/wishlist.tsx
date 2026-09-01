import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { getWishlist, removeFromWishlist } from "@/lib/supabase/db";
import { readWishlist, writeWishlist } from "@/components/product/wishlist-button";

type WishlistRow = {
  id: string;
  product_slug: string | null;
  product_name: string;
  product_image: string | null;
  product_price_cents: number | null;
};

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<WishlistRow[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/wishlist");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    getWishlist(user.id).then((rows) => { if (mounted) setItems(rows ?? []); });
    return () => { mounted = false; };
  }, [user]);

  async function handleRemove(id: string, slug: string | null) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    try {
      await removeFromWishlist(id);
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
    }
    // Keep the localStorage-backed WishlistButton state (used across product
    // cards) in sync so a product removed here doesn't still show "Saved"
    // when the shopper lands back on its card.
    if (slug) writeWishlist(readWishlist().filter((i) => i.slug !== slug));
  }

  if (loading || !user) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-4xl">
      <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to account
      </Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Saved gifts</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">Products you've saved while browsing the marketplace.</p>
      </div>

      {items === null ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Heart className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">Your wishlist is empty</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Tap "Save" on any product in the marketplace to keep it here.</p>
          <Link href="/products" className="mt-5 rounded-full bg-givit-ember px-5 py-2 text-sm font-semibold text-white hover:bg-givit-ember-hover">Browse marketplace</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="givit-panel overflow-hidden">
              <Link href={item.product_slug ? `/products/${item.product_slug}` : "/products"} className="block">
                <div className="aspect-square bg-givit-sand">
                  {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.product_name}</p>
                  {item.product_price_cents != null && (
                    <p className="mt-1 font-bold text-givit-ember">${(item.product_price_cents / 100).toFixed(2)}</p>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
                <Link href={item.product_slug ? `/products/${item.product_slug}` : "/products"} className="text-xs font-semibold text-givit-ember hover:underline">
                  View product
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.product_slug)}
                  aria-label="Remove from wishlist"
                  className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
