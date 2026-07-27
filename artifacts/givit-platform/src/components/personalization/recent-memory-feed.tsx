import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Brain, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { initials } from "@/lib/utils";

type MemoryEntry = {
  id: string;
  name: string;
  interests: string[];
  updatedAt: string;
};

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Replaces a generic "trending products" rail on the dashboard — a
 * relationship-memory product should show its memory growing, not a
 * marketplace feed. Pulls whichever saved people were touched most
 * recently (real gift_recipients.updated_at, not a fabricated timeline)
 * and shows what GIVIT currently knows about them.
 */
export function RecentMemoryFeed() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);

  useEffect(() => {
    if (!user) { setEntries(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      const withInterests = rows
        .filter((r) => (r.interests ?? []).length > 0)
        .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
        .slice(0, 4)
        .map((r) => ({ id: r.id, name: r.name, interests: r.interests ?? [], updatedAt: r.updated_at ?? r.created_at }));
      setEntries(withInterests);
    });
    return () => { mounted = false; };
  }, [user]);

  if (!user || !entries || entries.length === 0) return null;

  return (
    <section className="container py-8 md:py-12">
      <div className="mb-5 flex items-center gap-2 border-b border-border/40 pb-4">
        <Brain className="h-4 w-4 text-givit-ember" />
        <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">What GIVIT remembers</h2>
      </div>
      <div className="stagger-children grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="slide-up flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 opacity-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full givit-gradient text-base font-bold text-white">
              {initials(entry.name)}
            </div>
            <div className="min-w-0">
              <p className="text-base text-foreground">
                <span className="font-semibold">{entry.name}</span>
                <span className="text-muted-foreground"> · updated {timeAgo(entry.updatedAt)}</span>
              </p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.interests.slice(0, 5).map((interest) => (
                  <span key={interest} className="rounded-full bg-givit-sand px-2.5 py-1 text-xs font-medium text-givit-ink">{interest}</span>
                ))}
              </p>
              <Link href={`/gift?q=${encodeURIComponent(`Gift for ${entry.name}`)}`} className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-givit-ember hover:underline">
                <Sparkles className="h-3.5 w-3.5" /> Find something for {entry.name.split(" ")[0]}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
