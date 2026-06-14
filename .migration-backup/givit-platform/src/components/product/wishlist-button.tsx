"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Mail, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "givit-wishlist";

type WishlistItem = {
  slug: string;
  name: string;
  href: string;
  image?: string;
  price?: string;
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

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={compact ? "sm" : "default"}
      className={compact ? "h-8 rounded-full text-xs" : "h-10 w-full rounded-sm"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = readWishlist();
        if (current.some((entry) => entry.slug === item.slug)) {
          writeWishlist(current.filter((entry) => entry.slug !== item.slug));
          setSaved(false);
        } else {
          writeWishlist([item, ...current]);
          setSaved(true);
        }
      }}
      aria-pressed={saved}
    >
      {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

export function WishlistSharePanel() {
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

  const body = items.map((item, index) => `${index + 1}. ${item.name} — ${item.price ?? "Saved gift"} — ${item.href}`).join("\n");

  return (
    <div className="rounded-2xl border border-givit-ember/20 bg-givit-sand/50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-givit-ink"><Share2 className="h-4 w-4 text-givit-ember" /> Shareable wishlist</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Build a Christmas-list-style board, then send it to family or friends. Saved locally for guests; accounts can sync it later.</p>
      <a
        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-givit-ember px-4 text-xs font-bold text-white transition hover:bg-givit-ember-hover"
        href={`mailto:?subject=${encodeURIComponent("My Givit wishlist")}&body=${encodeURIComponent(body || "Here is my Givit wishlist. I will add gift ideas soon!")}`}
      >
        <Mail className="h-3.5 w-3.5" /> Send wishlist
      </a>
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
      <div className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">
        Save products while you browse. Your wishlist keeps the Givit product pages handy for birthdays, holidays, and shared boards.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <WishlistSharePanel />
      {items.slice(0, 6).map((item) => (
        <a key={item.slug} href={item.href} className="block rounded-2xl border border-border/60 bg-white p-3 transition hover:border-givit-ember/40 hover:shadow-sm">
          <p className="line-clamp-1 text-sm font-semibold text-givit-ink">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.price ?? "Saved gift"}</p>
        </a>
      ))}
    </div>
  );
}
