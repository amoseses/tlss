import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bookmark, Check, Mail, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { addToWishlist, removeFromWishlist } from "@/lib/supabase/db";

const STORAGE_KEY = "givit-wishlist";

type WishlistItem = {
  slug: string;
  name: string;
  href: string;
  image?: string;
  price?: string;
  productId?: string;
  wishlistId?: string;
};

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("givit:wishlist", { detail: items }));
}

export function WishlistButton({ item, compact = false }: { item: WishlistItem; compact?: boolean }) {
  const [saved, setSaved] = useState(() => readWishlist().some((entry) => entry.slug === item.slug));
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // If not logged in, redirect to login
    if (!user && !loading) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const current = readWishlist();
    const existingIndex = current.findIndex((entry) => entry.slug === item.slug);

    if (existingIndex >= 0) {
      // Remove from wishlist
      const existing = current[existingIndex];
      const updated = current.filter((entry) => entry.slug !== item.slug);
      writeWishlist(updated);
      setSaved(false);

      // Remove from database if logged in — wishlist_items.id (the row's own
      // primary key) is what removeFromWishlist deletes by, not product_id,
      // so it only works if we saved the row id back when we added it.
      if (user && existing.wishlistId) {
        try {
          await removeFromWishlist(existing.wishlistId);
        } catch (err) {
          console.error("Failed to remove from wishlist:", err);
        }
      }
    } else {
      // Add to wishlist
      let wishlistId: string | undefined;
      if (user) {
        try {
          const { data, error } = await addToWishlist({
            user_id: user.id,
            product_id: item.productId || item.slug,
            product_name: item.name,
            product_image: item.image,
            product_price_cents: item.price ? Math.round(parseFloat(item.price) * 100) : null,
            priority: 0,
          });
          if (error) throw error;
          wishlistId = data?.id;
        } catch (err) {
          console.error("Failed to add to wishlist:", err);
        }
      }
      const newItem = { ...item, wishlistId, savedAt: new Date().toISOString() };
      writeWishlist([newItem, ...current]);
      setSaved(true);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={compact ? "sm" : "default"}
      className={compact ? "h-8 rounded-full text-xs" : "h-10 w-full rounded-sm"}
      onClick={handleClick}
      aria-pressed={saved}
    >
      {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

export function WishlistSharePanel() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    const sync = () => setItems(readWishlist());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("givit:wishlist", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("givit:wishlist", sync as EventListener);
    };
  }, []);

  const absoluteHref = (href: string) => (typeof window !== "undefined" && href.startsWith("/") ? `${window.location.origin}${href}` : href);
  const body = items.map((item, index) => `${index + 1}. ${item.name} (${item.price ?? "Saved gift"}): ${absoluteHref(item.href)}`).join("\n");
  const text = body || "My GIVIT wishlist. I'll add gift ideas soon!";

  // mailto: links silently no-op whenever there's no default mail client
  // configured (very common in-browser, and inside embedded/preview
  // browsers), which read as the whole feature being broken. Clipboard copy
  // works everywhere with no dependency on local app config; Web Share is
  // used where the OS actually offers a native share sheet.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy wishlist:", err);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My GIVIT wishlist", text });
        return;
      } catch {
        // user cancelled the share sheet, or it's unsupported — fall through to copy
      }
    }
    await handleCopy();
  }

  // Actually sends server-side via Resend instead of a mailto: link, which
  // does nothing without a configured default mail client.
  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTo.trim() || sending) return;
    setSending(true);
    setEmailStatus("idle");
    try {
      const res = await fetch("/api/wishlist/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo.trim(), items: text }),
      });
      if (!res.ok) throw new Error("send failed");
      setEmailStatus("sent");
      setEmailTo("");
    } catch (err) {
      console.error("Failed to email wishlist:", err);
      setEmailStatus("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-givit-ember/20 bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-givit-ink"><Share2 className="h-4 w-4 text-givit-ember" /> Shareable wishlist</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Build a Christmas-list-style board, then send it to family or friends. Saved locally for guests; accounts can sync it later.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={items.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-givit-ember px-4 text-xs font-bold text-white transition hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Send wishlist"}
        </button>
        <button
          type="button"
          onClick={() => { setShowEmailForm((v) => !v); setEmailStatus("idle"); }}
          disabled={items.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-givit-ember/30 bg-card px-4 text-xs font-bold text-givit-ember transition hover:bg-givit-sand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="h-3.5 w-3.5" /> Email instead
        </button>
      </div>

      {showEmailForm && (
        <form onSubmit={handleSendEmail} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="email"
            required
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="their@email.com"
            className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
          />
          <button
            type="submit"
            disabled={sending || !emailTo.trim()}
            className="inline-flex h-9 items-center justify-center rounded-full bg-givit-ember px-4 text-xs font-bold text-white transition hover:bg-givit-ember-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
          {emailStatus === "sent" && <p className="w-full text-xs font-medium text-emerald-600">Sent.</p>}
          {emailStatus === "error" && <p className="w-full text-xs font-medium text-destructive">Couldn't send that. Try again.</p>}
        </form>
      )}
    </div>
  );
}

export function WishlistRail() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readWishlist());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("givit:wishlist", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("givit:wishlist", sync as EventListener);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-givit-ember/30 bg-card p-4 text-sm text-muted-foreground">
        Save products while you browse. Your wishlist keeps the GIVIT product pages handy for birthdays, holidays, and shared boards.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <WishlistSharePanel />
      {items.slice(0, 6).map((item) => (
        <a key={item.slug} href={item.href} className="block rounded-2xl border border-border/60 bg-card p-3 transition hover:border-givit-ember/40 hover:shadow-sm">
          <p className="line-clamp-1 text-sm font-semibold text-givit-ink">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.price ?? "Saved gift"}</p>
        </a>
      ))}
    </div>
  );
}
