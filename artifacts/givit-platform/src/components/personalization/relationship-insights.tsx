import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Brain, Heart, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { nextOccurrenceDate } from "@/lib/date-utils";
import { CountUp } from "@/components/ui/count-up";

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

      {/* An inline stat bar, not three identical bordered tiles -- the
          icon-in-circle-plus-number-in-a-box pattern repeated three times is
          the single most recognizable "AI dashboard" cliche there is. */}
      <div className="stagger-children flex flex-wrap items-stretch divide-x divide-border/40">
        <div className="slide-up flex items-center gap-2.5 py-1 pr-6 opacity-0">
          <UserRound className="h-4 w-4 shrink-0 text-givit-ember" />
          <p className="leading-tight">
            <CountUp value={insight.peopleCount} className="font-mono text-2xl font-bold text-givit-ink md:text-3xl" />{" "}
            <span className="text-sm text-muted-foreground">{insight.peopleCount === 1 ? "person" : "people"} remembered</span>
          </p>
        </div>
        <div className="slide-up flex items-center gap-2.5 py-1 px-6 opacity-0">
          <Brain className="h-4 w-4 shrink-0 text-givit-ember" />
          <p className="leading-tight">
            <CountUp value={insight.interestCount} className="font-mono text-2xl font-bold text-givit-ink md:text-3xl" />{" "}
            <span className="text-sm text-muted-foreground">interests known</span>
          </p>
        </div>
        <div className="slide-up flex items-center gap-2.5 py-1 pl-6 opacity-0">
          <Heart className="h-4 w-4 shrink-0 text-givit-ember" />
          <p className="leading-tight">
            <CountUp value={insight.lovedCount} className="font-mono text-2xl font-bold text-givit-ink md:text-3xl" />{" "}
            <span className="text-sm text-muted-foreground">gifts loved so far</span>
          </p>
        </div>
      </div>

      {insight.upcoming.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-givit-ember">
            <Bell className="h-3.5 w-3.5" /> Coming up
          </p>
          <div className="divide-y divide-border/40">
            {insight.upcoming.map((occ, i) => (
              <Link
                key={i}
                href={`/gift?q=${encodeURIComponent(`Gift for ${occ.name}, ${occ.label.toLowerCase()}`)}`}
                className="flex items-center justify-between gap-2 rounded-lg px-1 py-2.5 text-base transition hover:bg-muted/50"
              >
                <span className="text-foreground"><span className="font-semibold">{occ.name}</span>'s {occ.label.toLowerCase()}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${occ.daysUntil <= 14 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`}>
                  {occ.daysUntil === 0 ? "today" : `${occ.daysUntil}d`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {insight.needsDetail.length > 0 && (
        <div className="mt-6 flex items-start gap-3">
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
