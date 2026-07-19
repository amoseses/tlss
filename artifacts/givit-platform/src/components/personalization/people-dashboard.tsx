import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Sparkles, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";

type Occasion = { label: string; date: string };
type Person = {
  id: string;
  name: string;
  relationship: string;
  interests: string[];
  avoidTerms: string[];
  budgetCents: number | null;
  occasions: Occasion[];
};

function nextOccasion(occasions: Occasion[]) {
  const today = new Date();
  return occasions
    .filter((o) => o.date)
    .map((o) => ({ ...o, parsed: new Date(o.date) }))
    .filter((o) => o.parsed >= today)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];
}

function buildShopQuery(person: Person, occasion?: Occasion) {
  const parts = [`Gift for ${person.name}${person.relationship ? ` (${person.relationship})` : ""}`];
  if (occasion) parts.push(occasion.label.toLowerCase());
  if (person.budgetCents) parts.push(`budget ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(person.budgetCents / 100)}`);
  if (person.interests.length) parts.push(`loves ${person.interests.join(", ")}`);
  if (person.avoidTerms.length) parts.push(`avoid ${person.avoidTerms.join(", ")}`);
  return parts.join(", ");
}

function PersonCard({ person }: { person: Person }) {
  const [, navigate] = useLocation();
  const upcoming = nextOccasion(person.occasions);
  const daysUntil = upcoming ? Math.ceil((upcoming.parsed.getTime() - Date.now()) / 86400000) : null;
  const urgency = daysUntil == null ? "" : daysUntil <= 14 ? "bg-rose-50 text-rose-700" : daysUntil <= 42 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";

  return (
    <button
      type="button"
      onClick={() => navigate(`/gift?q=${encodeURIComponent(buildShopQuery(person, upcoming))}`)}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-givit-ember/30 hover:shadow-lg"
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full givit-gradient text-base font-bold text-white">
          {person.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-bold text-givit-ink">{person.name}</p>
          {person.relationship && <p className="text-xs text-muted-foreground">{person.relationship}</p>}
        </div>
      </div>

      {upcoming && daysUntil != null ? (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${urgency}`}>
          {upcoming.label} in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
        </span>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Nothing coming up</span>
      )}

      <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-givit-ember opacity-0 transition-opacity group-hover:opacity-100">
        <Sparkles className="h-3.5 w-3.5" /> Shop for {person.name.split(" ")[0]}
      </span>
    </button>
  );
}

/**
 * The homepage's front door for logged-in users with saved people — leads
 * with who you're shopping for, not a product grid. Reuses the same
 * gift_recipients + gift_occasions data AutoGift already collects, so this
 * is a second read of an existing "memory," not a new subsystem.
 */
export function PeopleDashboard() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    if (!user) { setPeople(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setPeople(rows.map((row) => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship || "",
        interests: row.interests ?? [],
        avoidTerms: row.avoid_terms ?? [],
        budgetCents: row.default_budget_cents ?? null,
        occasions: (row.gift_occasions ?? []).map((occ: any) => ({ label: occ.occasion, date: occ.occasion_date })),
      })));
    });
    return () => { mounted = false; };
  }, [user]);

  if (!user || people === null) return null;

  return (
    <section className="container py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Your people</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-givit-ink md:text-3xl">
            {people.length > 0 ? `You have ${people.length} ${people.length === 1 ? "person" : "people"} saved` : "Add the people you shop for"}
          </h2>
        </div>
        {people.length > 0 && <Link href="/people" className="givit-link shrink-0 text-sm font-medium">Manage all →</Link>}
      </div>

      {people.length === 0 ? (
        <Link
          href="/people"
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-12 text-center transition hover:border-givit-ember/40 hover:bg-givit-sand/40"
        >
          <UserRound className="h-8 w-8 text-givit-ember" />
          <p className="font-semibold text-givit-ink">Add your first person</p>
          <p className="max-w-sm text-sm text-muted-foreground">Name, relationship, interests, and a budget: about 30 seconds. Givit AI remembers them from then on.</p>
        </Link>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((p) => <PersonCard key={p.id} person={p} />)}
          <Link
            href="/people"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-center text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-semibold">Add person</span>
          </Link>
        </div>
      )}
    </section>
  );
}
