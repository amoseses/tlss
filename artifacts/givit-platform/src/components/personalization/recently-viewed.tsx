import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Clock } from "lucide-react";

export type RecentlyViewedItem = {
  slug: string;
  name: string;
  href: string;
  image?: string;
  price?: string;
  viewedAt: number;
};

const KEY = "givit-recently-viewed";

function readRecent(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(items: RecentlyViewedItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 12)));
  window.dispatchEvent(new CustomEvent("givit:recently-viewed", { detail: items }));
}

export function trackRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  const next = [{ ...item, viewedAt: Date.now() }, ...readRecent().filter((entry) => entry.slug !== item.slug)];
  writeRecent(next);
}

export function RecentlyViewedTracker({ item }: { item: Omit<RecentlyViewedItem, "viewedAt"> }) {
  useEffect(() => {
    trackRecentlyViewed(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  return null;
}

export function RecentlyViewedRail({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readRecent());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("givit:recently-viewed", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("givit:recently-viewed", sync as EventListener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={compact ? "rounded-3xl border border-border/70 bg-card p-4" : "givit-section"}>
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-givit-ink">
        <Clock className="h-4 w-4 text-givit-ember" /> Recently viewed
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.slice(0, 6).map((item) => (
          <Link key={item.slug} href={item.href} className="group rounded-2xl border border-border/60 bg-card p-2 transition hover:border-givit-ember/40 hover:shadow-sm">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-givit-sand">
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">🎁</div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-givit-ink">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{item.price ?? "Viewed gift"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
