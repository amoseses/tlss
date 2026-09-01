import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Gift, PlusCircle, Users, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createSecretSantaGroup, listMySecretSantaGroups, type SecretSantaGroup } from "@/lib/supabase/secret-santa";

export default function SecretSantaPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [groups, setGroups] = useState<SecretSantaGroup[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("Secret Santa");
  const [budget, setBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/secret-santa");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    listMySecretSantaGroups().then((rows) => { if (mounted) setGroups(rows); });
    return () => { mounted = false; };
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || creating) return;
    setCreating(true);
    setError("");
    const { data, error: err } = await createSecretSantaGroup({
      organizerId: user.id,
      name: name.trim(),
      occasion: occasion.trim() || undefined,
      budgetCents: budget ? Math.round(Number(budget) * 100) : undefined,
      eventDate: eventDate || undefined,
    });
    setCreating(false);
    if (err || !data) { setError("Couldn't create the group. Please try again."); return; }
    navigate(`/secret-santa/${data.id}`);
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
    <PageShell className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Group gifting</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Secret Santa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a group, add the people in it, and we'll shuffle who gives to whom -- privately, not even you can see the full list once it's shuffled.</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
          <PlusCircle className="h-4 w-4" /> New group
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="givit-panel mb-6 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Group name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Family Secret Santa 2026" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
              <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Secret Santa" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Budget per person (optional)</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" min="0" step="1" placeholder="$50" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Exchange date (optional)</label>
              <input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="date" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={creating || !name.trim()} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
              {creating ? "Creating..." : "Create group"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-full">Cancel</Button>
          </div>
        </form>
      )}

      {groups === null ? (
        <div className="flex min-h-[160px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Gift className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No groups yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Start one for family, friends, or a team -- everyone needs a GIVIT account to be added.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/secret-santa/${g.id}`} className="givit-panel flex items-center justify-between gap-3 p-4 transition hover:border-givit-ember/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-givit-ember/10">
                  {g.status === "shuffled" ? <Sparkles className="h-4 w-4 text-givit-ember" /> : <Users className="h-4 w-4 text-givit-ember" />}
                </div>
                <div>
                  <p className="font-semibold text-givit-ink">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.occasion || "Gift exchange"}
                    {g.budget_cents ? ` · $${(g.budget_cents / 100).toFixed(0)} budget` : ""}
                    {g.organizer_id === user.id ? " · You're organizing" : ""}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${g.status === "shuffled" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {g.status === "shuffled" ? "Shuffled" : "Open"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
