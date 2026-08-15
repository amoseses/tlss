import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Brain, Heart, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { nextOccurrenceDate } from "@/lib/date-utils";

type Occasion = { label: string; date: string };
type Insight = {
  peopleCount: number;
  interestCount: number;
  lovedCount: number;
  upcoming: { name: string; label: string; date: string; daysUntil: number }[];
  needsDetail: string[];
};

function computeInsights(rows: any[]): Insight {
  const today = new Date();
  let interestCount = 0;
  let lovedCount = 0;
  const upcoming: Insight["upcoming"] = [];
  const needsDetail: string[] = [];

  for (const row of rows) {
    const interests: string[] = row.interests ?? [];
    interestCount += interests.length;
    if (interests.length === 0) needsDetail.push(row.name);

    const notes: string = row.notes ?? "";
    lovedCount += notes.split("\n").filter((line: string) => line.trim().startsWith("Liked:")).length;

    const occasions: Occasion[] = (row.gift_occasions ?? []).map((occ: any) => ({ label: occ.occasion, date: occ.occasion_date }));
    for (const occ of occasions) {
      if (!occ.date) continue;
      const parsed = nextOccurrenceDate(occ.date, today);
      const daysUntil = Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
      if (daysUntil >= 0 && daysUntil <= 45) {
        upcoming.push({ name: row.name, label: occ.label, date: occ.date, daysUntil });
      }
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  return { peopleCount: rows.length, interestCount, lovedCount, upcoming: upcoming.slice(0, 3), needsDetail: needsDetail.slice(0, 2) };
}

/**
 * Replaces the Dashboard's "recently viewed products" rail — that framing
 * is pure marketplace and undercuts the relationship-memory positioning.
 * This surfaces what GIVIT actually knows and is doing for you: how much
 * memory it holds, what's coming up, and where the memory is thin.
 */
export function RelationshipInsights() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    if (!user) { setInsight(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setInsight(computeInsights(rows));
    });
    return () => { mounted = false; };
  }, [user]);

  if (!user || !insight || insight.peopleCount === 0) return null;

  return (
    <section className="container py-8 md:py-12">
      <div className="mb-5 flex items-center gap-2">
        <Brain className="h-4 w-4 text-givit-ember" />
        <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Relationship intelligence</h2>
      </div>

      <div className="stagger-children grid gap-4 sm:grid-cols-3">
        <div className="slide-up flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-5 opacity-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-givit-sand">
            <UserRound className="h-6 w-6 text-givit-ember" />
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-givit-ink md:text-3xl">{insight.peopleCount}</p>
            <p className="text-sm text-muted-foreground">{insight.peopleCount === 1 ? "person" : "people"} remembered</p>
          </div>
        </div>
        <div className="slide-up flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-5 opacity-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-givit-sand">
            <Brain className="h-6 w-6 text-givit-ember" />
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-givit-ink md:text-3xl">{insight.interestCount}</p>
            <p className="text-sm text-muted-foreground">interests known</p>
          </div>
        </div>
        <div className="slide-up flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-5 opacity-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-givit-sand">
            <Heart className="h-6 w-6 text-givit-ember" />
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-givit-ink md:text-3xl">{insight.lovedCount}</p>
            <p className="text-sm text-muted-foreground">gifts loved so far</p>
          </div>
        </div>
      </div>

      {insight.upcoming.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-card p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-givit-ember">
            <Bell className="h-3.5 w-3.5" /> Coming up
          </p>
          <div className="space-y-2">
            {insight.upcoming.map((occ, i) => (
              <Link
                key={i}
                href={`/gift?q=${encodeURIComponent(`Gift for ${occ.name}, ${occ.label.toLowerCase()}`)}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-base transition hover:bg-muted/50"
              >
                <span className="text-foreground"><span className="font-semibold">{occ.name}</span>'s {occ.label.toLowerCase()}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${occ.daysUntil <= 14 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                  {occ.daysUntil === 0 ? "today" : `${occ.daysUntil}d`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {insight.needsDetail.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-givit-ember/40 bg-givit-sand/40 p-5">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-givit-ember" />
          <p className="text-base text-foreground">
            GIVIT doesn't know much about {insight.needsDetail.join(" or ")} yet.{" "}
            <Link href="/people" className="font-semibold text-givit-ember hover:underline">Add an interest</Link> for sharper ideas.
          </p>
        </div>
      )}
    </section>
  );
}
