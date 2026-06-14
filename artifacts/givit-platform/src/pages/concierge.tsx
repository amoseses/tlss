import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Bell, Calendar, Gift, Package, Plus, Sparkles, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";

type Occasion = { label: string; date: string };
type Recipient = { id: string; name: string; relationship: string; occasions: Occasion[] };
type RecipientForm = { name: string; relationship: string; occasions: Occasion[] };

const EMPTY_FORM: RecipientForm = { name: "", relationship: "", occasions: [{ label: "Birthday", date: "" }] };
const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASION_TYPES = ["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];

function AddRecipientModal({ onAdd, onClose }: { onAdd: (r: Recipient) => void; onClose: () => void }) {
  const [form, setForm] = useState<RecipientForm>(EMPTY_FORM);

  function addOccasion() {
    setForm((f) => ({ ...f, occasions: [...f.occasions, { label: "Birthday", date: "" }] }));
  }

  function removeOccasion(i: number) {
    setForm((f) => ({ ...f, occasions: f.occasions.filter((_, idx) => idx !== i) }));
  }

  function updateOccasion(i: number, field: keyof Occasion, value: string) {
    setForm((f) => {
      const occasions = [...f.occasions];
      occasions[i] = { ...occasions[i], [field]: value };
      return { ...f, occasions };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      relationship: form.relationship,
      occasions: form.occasions.filter((o) => o.date),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Add a recipient</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Full name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mom, Sarah, John" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Relationship</label>
            <select value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
              <option value="">Select...</option>
              {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Occasions</label>
              <button type="button" onClick={addOccasion} className="inline-flex items-center gap-1 text-xs font-semibold text-givit-ember hover:underline">
                <Plus className="h-3 w-3" /> Add date
              </button>
            </div>
            {form.occasions.map((occ, i) => (
              <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                <select value={occ.label} onChange={(e) => updateOccasion(i, "label", e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none">
                  {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input type="date" value={occ.date} onChange={(e) => updateOccasion(i, "date", e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                {form.occasions.length > 1 && (
                  <button type="button" onClick={() => removeOccasion(i)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Save recipient</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipientCard({ recipient, onDelete }: { recipient: Recipient; onDelete: () => void }) {
  const today = new Date();
  const upcoming = recipient.occasions
    .filter((o) => o.date)
    .map((o) => ({ ...o, parsed: new Date(o.date) }))
    .filter((o) => o.parsed >= today)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];

  const daysUntil = upcoming ? Math.ceil((upcoming.parsed.getTime() - today.getTime()) / 86400000) : null;

  return (
    <div className="givit-panel flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-givit-ember/10 text-base font-bold text-givit-ember">
            {recipient.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-givit-ink">{recipient.name}</p>
            {recipient.relationship && <p className="text-xs text-muted-foreground">{recipient.relationship}</p>}
          </div>
        </div>
        <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {recipient.occasions.length > 0 && (
        <div className="space-y-1.5">
          {recipient.occasions.slice(0, 3).map((occ, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-foreground">{occ.label}</span>
              <span className="text-muted-foreground">{new Date(occ.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      )}

      {daysUntil !== null && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${daysUntil <= 14 ? "bg-rose-50 text-rose-700" : daysUntil <= 42 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          <Bell className="h-3.5 w-3.5" />
          {upcoming?.label} in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
        </div>
      )}

      <Link href="/gift" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-givit-ember/30 py-1.5 text-xs font-semibold text-givit-ember transition hover:bg-givit-ember/5">
        <Sparkles className="h-3 w-3" /> Find a gift
      </Link>
    </div>
  );
}

export default function ConciergePage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/concierge");
  }, [loading, user, navigate]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("givit-recipients");
      if (saved) setRecipients(JSON.parse(saved));
    } catch {}
  }, []);

  function saveRecipients(list: Recipient[]) {
    setRecipients(list);
    window.localStorage.setItem("givit-recipients", JSON.stringify(list));
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!user) return null;

  const upcomingAll = recipients
    .flatMap((r) =>
      r.occasions.filter((o) => o.date).map((o) => ({ ...o, recipient: r.name, parsed: new Date(o.date) }))
    )
    .filter((o) => o.parsed >= new Date())
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(0, 5);

  return (
    <PageShell>
      {showModal && (
        <AddRecipientModal
          onAdd={(r) => saveRecipients([...recipients, r])}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gift concierge</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {profile?.full_name ? `Welcome back, ${profile.full_name}.` : "Welcome back."} Add people below to set up automatic reminders.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
          <Plus className="h-4 w-4" /> Add person
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div>
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10 text-3xl">👥</div>
              <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No recipients yet</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">Add the people you regularly gift to — with their birthdays, anniversaries, and other key dates.</p>
              <Button onClick={() => setShowModal(true)} className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                <Users className="h-4 w-4" /> Add your first person
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipients.map((r) => (
                <RecipientCard
                  key={r.id}
                  recipient={r}
                  onDelete={() => saveRecipients(recipients.filter((x) => x.id !== r.id))}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-8 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
              >
                <Plus className="h-6 w-6" />
                Add person
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {upcomingAll.length > 0 && (
            <div className="givit-section">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-givit-ember" />
                <h2 className="font-semibold text-givit-ink">Upcoming</h2>
              </div>
              <div className="space-y-2.5">
                {upcomingAll.map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{o.recipient}</p>
                      <p className="text-xs text-muted-foreground">{o.label}</p>
                    </div>
                    <p className="text-xs font-semibold text-givit-ember">
                      {o.parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/10 to-amber-100/40 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-givit-ink">How AutoGift works</h2>
                <ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                  <li>1. Add people and their key dates</li>
                  <li>2. We remind you 5–6 weeks before each</li>
                  <li>3. Pick a gift from AI suggestions</li>
                  <li>4. We order, write a card, and deliver</li>
                </ol>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button asChild className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover text-xs h-9">
                <Link href="/gift"><Gift className="h-3.5 w-3.5" /> Try AI gift finder</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg text-xs h-9">
                <Link href="/products"><Package className="h-3.5 w-3.5" /> Browse marketplace</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
