import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Bell, Pencil, Plus, Sparkles, Trash2, UserRound, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { extractRecipientProfile } from "@/lib/ai/recipient-extract";
import { useRecipients, type Occasion, type Recipient } from "@/lib/hooks/use-recipients";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASION_TYPES = ["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];

function AddRecipientModal({ onAdd, onClose }: { onAdd: (recipients: Recipient[]) => void; onClose: () => void }) {
  type PersonForm = { name: string; relationship: string; occasions: Occasion[]; aboutText: string };
  const emptyPerson = (): PersonForm => ({ name: "", relationship: "", occasions: [{ label: "Birthday", date: "" }], aboutText: "" });
  const [people, setPeople] = useState<PersonForm[]>([emptyPerson()]);
  const [saving, setSaving] = useState(false);

  function addPerson() {
    setPeople((prev) => [...prev, emptyPerson()]);
  }

  function removePerson(i: number) {
    setPeople((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePerson(i: number, field: keyof PersonForm, value: string) {
    setPeople((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function addOccasion(personIndex: number) {
    setPeople((prev) => prev.map((p, idx) => (idx === personIndex ? { ...p, occasions: [...p.occasions, { label: "Birthday", date: "" }] } : p)));
  }

  function removeOccasion(personIndex: number, occIndex: number) {
    setPeople((prev) => prev.map((p, idx) => (idx === personIndex ? { ...p, occasions: p.occasions.filter((_, oi) => oi !== occIndex) } : p)));
  }

  function updateOccasion(personIndex: number, occIndex: number, field: keyof Occasion, value: string) {
    setPeople((prev) => prev.map((p, idx) => {
      if (idx !== personIndex) return p;
      const occasions = [...p.occasions];
      occasions[occIndex] = { ...occasions[occIndex], [field]: value };
      return { ...p, occasions };
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = people.filter((p) => p.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const built = await Promise.all(valid.map(async (p) => {
        const extracted = await extractRecipientProfile(p.aboutText);
        return {
          id: crypto.randomUUID(),
          name: p.name.trim(),
          relationship: p.relationship,
          occasions: p.occasions.filter((o) => o.date),
          interests: extracted.interests,
          avoidTerms: extracted.avoidTerms,
          budgetCents: extracted.budgetCents,
        } satisfies Recipient;
      }));
      onAdd(built);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Add people</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5">
          {people.map((person, personIndex) => (
            <div key={personIndex} className="space-y-3 rounded-lg border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-givit-ink">Person {personIndex + 1}</p>
                {people.length > 1 && (
                  <button type="button" onClick={() => removePerson(personIndex)} className="text-xs font-medium text-destructive hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Full name *</label>
                <input value={person.name} onChange={(e) => updatePerson(personIndex, "name", e.target.value)} required placeholder="e.g. Mom, Sarah, John" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Relationship</label>
                <select value={person.relationship} onChange={(e) => updatePerson(personIndex, "relationship", e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Occasions</label>
                  <button type="button" onClick={() => addOccasion(personIndex)} className="inline-flex items-center gap-1 text-xs font-semibold text-givit-ember hover:underline">
                    <Plus className="h-3 w-3" /> Add date
                  </button>
                </div>
                {person.occasions.map((occ, i) => (
                  <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                    <select value={occ.label} onChange={(e) => updateOccasion(personIndex, i, "label", e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none">
                      {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <input type="date" value={occ.date} onChange={(e) => updateOccasion(personIndex, i, "date", e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                    {person.occasions.length > 1 && (
                      <button type="button" onClick={() => removeOccasion(personIndex, i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-givit-ember" /> Tell us about them (optional)
                </label>
                <textarea
                  value={person.aboutText}
                  onChange={(e) => updatePerson(personIndex, "aboutText", e.target.value)}
                  rows={2}
                  placeholder="e.g. Loves gardening, homemade food, and traveling. Already has lots of kitchen gadgets."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
                <p className="text-xs text-muted-foreground">GIVIT AI reads this and fills in interests and things to avoid automatically.</p>
              </div>
            </div>
          ))}

          <button type="button" onClick={addPerson} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border/60 py-3 text-sm font-semibold text-givit-ember transition hover:border-givit-ember/40">
            <Plus className="h-4 w-4" /> Add another person
          </button>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-md" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover disabled:opacity-60">
              {saving ? "Saving…" : `Save ${people.filter((p) => p.name.trim()).length || ""} recipient${people.filter((p) => p.name.trim()).length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function splitTags(text: string) {
  return text.split(",").map((t) => t.trim()).filter(Boolean);
}

// The only way to change a saved person's interests used to be deleting
// them and starting over — this is the actual edit path, prefilled with
// their current profile. The "tell us about them" box stays available so
// GIVIT AI can still extract from a fresh sentence; anything it finds is
// merged into (not replacing) whatever's typed directly into the fields.
function EditRecipientModal({
  recipient,
  onSave,
  onSaveOccasions,
  onClose,
}: {
  recipient: Recipient;
  onSave: (updates: Partial<Recipient>) => Promise<{ error: unknown }>;
  onSaveOccasions: (occasions: Occasion[]) => Promise<{ error: unknown }>;
  onClose: () => void;
}) {
  const [name, setName] = useState(recipient.name);
  const [relationship, setRelationship] = useState(recipient.relationship || "");
  const [interestsText, setInterestsText] = useState((recipient.interests ?? []).join(", "));
  const [avoidText, setAvoidText] = useState((recipient.avoidTerms ?? []).join(", "));
  const [budget, setBudget] = useState(recipient.budgetCents ? String(recipient.budgetCents / 100) : "");
  const [notes, setNotes] = useState(recipient.notes ?? "");
  const [aboutText, setAboutText] = useState("");
  const [occasions, setOccasions] = useState<Occasion[]>(recipient.occasions.length > 0 ? recipient.occasions : [{ label: "Birthday", date: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOccasion() {
    setOccasions((prev) => [...prev, { label: "Birthday", date: "" }]);
  }
  function removeOccasion(i: number) {
    setOccasions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateOccasion(i: number, field: keyof Occasion, value: string) {
    setOccasions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let interests = splitTags(interestsText);
      let avoidTerms = splitTags(avoidText);
      let budgetCents = budget.trim() ? Math.round(Number.parseFloat(budget) * 100) : null;

      if (aboutText.trim()) {
        const extracted = await extractRecipientProfile(aboutText);
        interests = Array.from(new Set([...interests, ...extracted.interests]));
        avoidTerms = Array.from(new Set([...avoidTerms, ...extracted.avoidTerms]));
        if (!budgetCents && extracted.budgetCents) budgetCents = extracted.budgetCents;
      }

      const [profileResult, occasionsResult] = await Promise.all([
        onSave({
          name: name.trim(),
          relationship,
          interests,
          avoidTerms,
          budgetCents: Number.isFinite(budgetCents) ? budgetCents : null,
          notes: notes.trim() || null,
        }),
        onSaveOccasions(occasions.filter((o) => o.date)),
      ]);
      if (profileResult.error || occasionsResult.error) {
        setError("Couldn't save your changes. Try again.");
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Edit {recipient.name}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Full name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Relationship</label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20">
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
            {occasions.map((occ, i) => (
              <div key={occ.id ?? `new-${i}`} className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                <select value={occ.label} onChange={(e) => updateOccasion(i, "label", e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none">
                  {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input type="date" value={occ.date} onChange={(e) => updateOccasion(i, "date", e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
                {occasions.length > 1 && (
                  <button type="button" onClick={() => removeOccasion(i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Interests</label>
            <input value={interestsText} onChange={(e) => setInterestsText(e.target.value)} placeholder="gardening, coffee, true crime podcasts" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
            <p className="text-xs text-muted-foreground">Comma-separated. This is what GIVIT AI matches gifts against.</p>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Avoid</label>
            <input value={avoidText} onChange={(e) => setAvoidText(e.target.value)} placeholder="already has a kettle, allergic to nuts" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Usual budget</label>
            <input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="75" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Notes / gift history</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-givit-ember" /> Or just describe them (optional)
            </label>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={2}
              placeholder="e.g. Also really into hiking lately, and just got a French press."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
            />
            <p className="text-xs text-muted-foreground">GIVIT AI adds whatever it finds here on top of the fields above.</p>
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-md" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()} className="flex-1 rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PersonProfileCard({ recipient, onDelete, onEdit, onToggleAutomation }: { recipient: Recipient; onDelete: () => void; onEdit: () => void; onToggleAutomation: () => void }) {
  const today = new Date();
  const upcoming = recipient.occasions
    .filter((o) => o.date)
    .map((o) => ({ ...o, parsed: new Date(o.date) }))
    .filter((o) => o.parsed >= today)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];
  const daysUntil = upcoming ? Math.ceil((upcoming.parsed.getTime() - today.getTime()) / 86400000) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full givit-gradient text-base font-bold text-white">
            {recipient.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-serif text-base font-bold text-givit-ink">{recipient.name}</p>
            {recipient.relationship && <p className="text-xs text-muted-foreground">{recipient.relationship}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleAutomation}
            title={`AutoGift is ${recipient.automationEnabled !== false ? "on" : "off"} for ${recipient.name}`}
            aria-pressed={recipient.automationEnabled !== false}
            className="group flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-1 transition hover:bg-muted"
          >
            <Zap className={`h-3.5 w-3.5 transition-colors ${recipient.automationEnabled !== false ? "fill-emerald-500 text-emerald-500" : "text-muted-foreground"}`} />
            <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${recipient.automationEnabled !== false ? "bg-emerald-500" : "bg-border group-hover:bg-muted-foreground/40"}`}>
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                  recipient.automationEnabled !== false ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
          <button type="button" onClick={onEdit} aria-label={`Edit ${recipient.name}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} aria-label={`Remove ${recipient.name}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {recipient.interests && recipient.interests.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {recipient.interests.map((interest) => (
            <span key={interest} className="rounded-full bg-givit-sand px-2.5 py-1 text-xs font-medium text-givit-ink">{interest}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">No interests learned yet: describe them next time you edit.</p>
      )}

      {recipient.budgetCents ? (
        <p className="text-xs text-muted-foreground">Usual budget: <span className="font-semibold text-foreground">${(recipient.budgetCents / 100).toFixed(0)}</span></p>
      ) : null}

      {recipient.notes?.trim() && (
        <div className="rounded-lg bg-givit-ember/5 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-givit-ember">Gift history</p>
          <ul className="mt-1 space-y-0.5 text-xs leading-5 text-muted-foreground">
            {recipient.notes.trim().split("\n").slice(-3).reverse().map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      )}

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
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${daysUntil <= 14 ? "bg-rose-50 text-rose-700" : daysUntil <= 42 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          <Bell className="h-3 w-3" /> {upcoming?.label} in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
        </span>
      )}

      <Link
        href={`/gift?q=${encodeURIComponent(`Gift for ${recipient.name}`)}`}
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-givit-ember py-2 text-xs font-semibold text-white transition hover:bg-givit-ember-hover"
      >
        <Sparkles className="h-3.5 w-3.5" /> Shop for {recipient.name.split(" ")[0]}
      </Link>
    </div>
  );
}

export default function PeoplePage() {
  const { user, loading } = useAuth();
  const { recipients, localReady, saveRecipients, deleteRecipient, updateRecipient, updateOccasions, toggleAutomation } = useRecipients(user);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRecipient = editingId ? recipients.find((r) => r.id === editingId) : null;

  if (loading && !localReady) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="relative overflow-hidden rounded-2xl bg-black px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-givit-ember/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-givit-coral/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl givit-gradient givit-glow">
              <UserRound className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-white">Your people, remembered.</h2>
            <p className="text-sm leading-6 text-white/70">Save the people you care about once. GIVIT AI keeps their interests, budgets, and dates so you never start from zero.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full givit-gradient px-6 text-white hover:brightness-110"><Link href="/signup?next=/people">Create free account</Link></Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 px-6 text-white hover:bg-white/20"><Link href="/login?next=/people">Log in</Link></Button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {showModal && (
        <AddRecipientModal
          onAdd={(added) => void saveRecipients([...recipients, ...added])}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingRecipient && (
        <EditRecipientModal
          recipient={editingRecipient}
          onSave={(updates) => updateRecipient(editingRecipient.id, updates)}
          onSaveOccasions={(occasions) => updateOccasions(editingRecipient.id, occasions)}
          onClose={() => setEditingId(null)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">People</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">The people you care about</h1>
          <p className="mt-1 text-sm text-muted-foreground">Interests, budgets, and dates: saved once, remembered by GIVIT AI every time.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
          <Plus className="h-4 w-4" /> Add person
        </Button>
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-givit-ember/10">
            <UserRound className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No one saved yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Add Mom, your best friend, a coworker, anyone. About 30 seconds each.</p>
          <Button onClick={() => setShowModal(true)} className="mt-5 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Plus className="h-4 w-4" /> Add your first person
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipients.map((r) => (
            <PersonProfileCard
              key={r.id}
              recipient={r}
              onDelete={() => void deleteRecipient(r.id)}
              onEdit={() => setEditingId(r.id)}
              onToggleAutomation={() => void toggleAutomation(r.id, r.automationEnabled === false)}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 py-8 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
          >
            <Plus className="h-6 w-6" />
            Add person
          </button>
        </div>
      )}

      {recipients.length > 0 && (
        <Link href="/concierge" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-givit-ember hover:underline">
          See reminders and automation in AutoGift <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </PageShell>
  );
}
