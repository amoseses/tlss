import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Gift, PlusCircle, Users, Sparkles, ShieldCheck, Shuffle, PartyPopper } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { GiftBox3D } from "@/components/ui/gift-box-3d";
import { useAuth } from "@/lib/auth/use-auth";
import { createSecretSantaGroup, listMySecretSantaGroups, type SecretSantaGroup } from "@/lib/supabase/secret-santa";

const HOW_IT_WORKS = [
  { Icon: PlusCircle, title: "Start a group", desc: "Name it, set a budget and exchange date -- takes about 20 seconds." },
  { Icon: Users, title: "Add everyone", desc: "Each person needs a GIVIT account so their wishlist stays theirs to edit." },
  { Icon: Shuffle, title: "Shuffle & reveal", desc: "One click assigns everyone privately -- not even the organizer can see the full list." },
];

export default function SecretSantaPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [groups, setGroups] = useState<SecretSantaGroup[] | null>(null);
  const [loadError, setLoadError] = useState("");
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
    // listMySecretSantaGroups() throws on any Supabase error (missing
    // table/RLS issue, network blip) -- with no .catch(), that rejection
    // was unhandled and `groups` stayed null forever, which is exactly
    // "stuck loading" from the caller's point of view since the loading
    // spinner below is keyed on `groups === null`.
    listMySecretSantaGroups()
      .then((rows) => { if (mounted) setGroups(rows); })
      .catch((err) => {
        console.error("Failed to load Secret Santa groups:", err);
        if (mounted) { setGroups([]); setLoadError("Couldn't load your groups. Refresh to try again."); }
      });
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
    <PageShell wide>
      {/* Dark instrument-panel hero, same material language as Marketplace/
          Concierge/People's own heroes -- Secret Santa is a first-class
          feature, not a utility form, and it should look like one. */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-black p-8 text-white shadow-xl md:p-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-givit-coral/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-10 h-72 w-72 rounded-full bg-givit-ember/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
              <span className="text-givit-coral">GIVIT</span>
              <span>GROUP GIFTING</span>
            </div>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.05] md:text-5xl">
              Secret Santa
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/60 md:text-base">
              Create a group, everyone adds a wishlist, and we shuffle who gives to whom -- privately, so not even the organizer can see the full list once it's drawn.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setShowCreate((v) => !v)} className="h-11 rounded-full givit-gradient px-6 text-white hover:brightness-110">
                <PlusCircle className="h-4 w-4" /> New group
              </Button>
              <div className="flex items-center gap-1.5 text-xs font-medium text-white/50">
                <ShieldCheck className="h-3.5 w-3.5" /> Assignments are never readable by anyone but the giver
              </div>
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <GiftBox3D size={110} glow={0.35} />
          </div>
        </div>
      </section>

      {/* How it works -- a first-time visitor to this page has no other
          context for what a "group" or "shuffle" even means here. */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title} className="givit-panel flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-givit-ember/10 font-mono text-xs font-bold text-givit-ember">
              {i + 1}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-givit-ink"><step.Icon className="h-3.5 w-3.5 text-givit-ember" /> {step.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="givit-panel slide-up mb-8 space-y-3 p-5">
          <p className="flex items-center gap-2 font-serif text-lg font-bold text-givit-ink"><Gift className="h-4 w-4 text-givit-ember" /> Start a new group</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Group name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Family Secret Santa 2026" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
              <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Secret Santa" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Budget per person (optional)</label>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" min="0" step="1" placeholder="$50" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Exchange date (optional)</label>
              <input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="date" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
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

      {loadError && <p className="mb-4 text-sm font-medium text-destructive">{loadError}</p>}

      {groups === null ? (
        <div className="flex min-h-[160px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-givit-ember/10">
            <PartyPopper className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No groups yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Start one for family, friends, or a team -- everyone needs a GIVIT account to be added.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-5 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <PlusCircle className="h-4 w-4" /> Start your first group
          </Button>
        </div>
      ) : (
        <div className="stagger-children grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/secret-santa/${g.id}`}
              className="slide-up givit-panel group flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:border-givit-ember/40 hover:shadow-lg"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl givit-gradient text-white shadow-sm">
                  {g.status === "shuffled" ? <Sparkles className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif font-bold text-givit-ink transition-colors group-hover:text-givit-ember">{g.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.occasion || "Gift exchange"}
                    {g.budget_cents ? ` · $${(g.budget_cents / 100).toFixed(0)} budget` : ""}
                    {g.organizer_id === user.id ? " · You're organizing" : ""}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${g.status === "shuffled" ? "bg-success/10 text-success" : "bg-amber-50 text-amber-700"}`}>
                {g.status === "shuffled" ? "Shuffled" : "Open"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
