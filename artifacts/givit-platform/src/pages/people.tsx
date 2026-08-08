import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Bell, CalendarPlus, Flower2, Pencil, Plus, Sparkles, Trash2, UserRound, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { extractRecipientProfile } from "@/lib/ai/recipient-extract";
import { useRecipients, type Occasion, type Recipient } from "@/lib/hooks/use-recipients";
import { nextOccurrenceDate } from "@/lib/date-utils";
import { trackEvent } from "@/lib/supabase/db";
import { createClient } from "@/lib/supabase/client";
import { parseIcs, type ParsedCalendarEvent } from "@/lib/ics-import";
import { initials } from "@/lib/utils";

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASION_TYPES = ["Birthday", "Anniversary", "Christmas", "Hanukkah", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];

// Occasion labels tied to a real calendar date shouldn't be settable to some
// unrelated date (e.g. "Valentine's Day" on a random July date) -- these get
// their date auto-filled to the next real occurrence and the field locked.
const FIXED_HOLIDAY_DATES: Record<string, { month: number; day: number }> = {
  Christmas: { month: 12, day: 25 },
  "Valentine's Day": { month: 2, day: 14 },
};
// Hanukkah follows the Hebrew calendar, so it has no fixed month/day -- first
// night by Gregorian year, looked up rather than computed.
const HANUKKAH_FIRST_NIGHT: Record<number, { month: number; day: number }> = {
  2025: { month: 12, day: 14 },
  2026: { month: 12, day: 4 },
  2027: { month: 12, day: 24 },
  2028: { month: 12, day: 12 },
  2029: { month: 12, day: 1 },
  2030: { month: 12, day: 20 },
};
const LOCKED_OCCASION_LABELS = new Set(["Christmas", "Hanukkah", "Valentine's Day", "Mother's Day", "Father's Day"]);
// Only Birthday and Anniversary need a specific year -- every other occasion
// either recurs on a fixed date (locked/auto-computed above) or is a
// month-and-day-only reminder with no meaningful year of its own.
const YEARLESS_OCCASION_LABELS = new Set(["Graduation", "Other"]);
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Mother's/Father's Day float to the Nth Sunday of a fixed month rather than
// a fixed day-of-month, but are still fully determined by the label alone.
function nthSundayOfMonth(year: number, month: number, n: number) {
  const first = new Date(year, month - 1, 1);
  const firstSunday = 1 + ((7 - first.getDay()) % 7);
  return new Date(year, month - 1, firstSunday + (n - 1) * 7);
}

function computeHolidayDate(label: string, year: number): Date | null {
  if (label === "Mother's Day") return nthSundayOfMonth(year, 5, 2);
  if (label === "Father's Day") return nthSundayOfMonth(year, 6, 3);
  if (label === "Hanukkah") {
    const night = HANUKKAH_FIRST_NIGHT[year];
    return night ? new Date(year, night.month - 1, night.day) : null;
  }
  const fixed = FIXED_HOLIDAY_DATES[label];
  return fixed ? new Date(year, fixed.month - 1, fixed.day) : null;
}

// The next occurrence on or after today, so picking "Christmas" in July
// lands on this December, not one that already passed.
function nextHolidayDateString(label: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = computeHolidayDate(label, today.getFullYear());
  if (!thisYear) return null;
  const next = thisYear >= today ? thisYear : computeHolidayDate(label, today.getFullYear() + 1);
  return next ? next.toISOString().slice(0, 10) : null;
}

// For month/day-only occasions (no year picker shown): resolve the same
// month+day pair to whichever of this year or next hasn't already passed.
function nextMonthDayDateString(month: number, day: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  const next = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, month - 1, day);
  return next.toISOString().slice(0, 10);
}

function dateMonth(iso: string): number {
  return iso ? Number(iso.slice(5, 7)) : new Date().getMonth() + 1;
}
function dateDay(iso: string): number {
  return iso ? Number(iso.slice(8, 10)) : new Date().getDate();
}

// Shared date control for one occasion row: a locked auto-filled date for
// fixed holidays, a plain year-inclusive date picker for Birthday/Anniversary
// (the only two occasions where the year itself matters), and a month+day
// picker with no year field for everything else.
function OccasionDateInput({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const locked = LOCKED_OCCASION_LABELS.has(label);
  if (locked) {
    return (
      <input
        type="date"
        value={value}
        readOnly
        title={`${label} falls on a fixed date and is set automatically`}
        className="h-9 w-full rounded-md border border-border bg-muted px-2 text-sm text-muted-foreground outline-none"
      />
    );
  }
  if (YEARLESS_OCCASION_LABELS.has(label)) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={dateMonth(value)}
          onChange={(e) => onChange(nextMonthDayDateString(Number(e.target.value), dateDay(value)))}
          className="h-9 w-full rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
        >
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={dateDay(value)}
          onChange={(e) => onChange(nextMonthDayDateString(dateMonth(value), Number(e.target.value)))}
          className="h-9 w-full rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    );
  }
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      max={label === "Birthday" ? todayISO() : undefined}
      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
    />
  );
}

const LEAD_TIME_OPTIONS = [7, 14, 21, 35, 56];

// How far ahead AutoGift reminds you for this occasion. Shorter windows are
// offered because some people want them, but they genuinely narrow what's
// deliverable in time -- surfaced here rather than hidden, so a 1-week
// reminder for a gift that needs 2 weeks to ship isn't a silent failure.
function LeadTimeSelect({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Remind me</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-givit-ember/20"
      >
        {LEAD_TIME_OPTIONS.map((days) => (
          <option key={days} value={days}>{days % 7 === 0 ? `${days / 7} week${days === 7 ? "" : "s"}` : `${days} days`} before</option>
        ))}
      </select>
      {value < 14 && (
        <span className="text-xs text-muted-foreground">— may limit delivery options</span>
      )}
    </div>
  );
}

function AddRecipientModal({ onAdd, onClose, defaultLeadDays }: { onAdd: (recipients: Recipient[]) => void; onClose: () => void; defaultLeadDays: number }) {
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

  function updateOccasion(personIndex: number, occIndex: number, field: keyof Occasion, value: string | number) {
    setPeople((prev) => prev.map((p, idx) => {
      if (idx !== personIndex) return p;
      const occasions = [...p.occasions];
      const next = { ...occasions[occIndex], [field]: value };
      if (field === "label" && LOCKED_OCCASION_LABELS.has(value)) {
        next.date = nextHolidayDateString(value) ?? next.date;
      }
      occasions[occIndex] = next;
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
        let occasions = p.occasions.filter((o) => o.date);
        if (extracted.birthdayDate && !occasions.some((o) => o.label === "Birthday")) {
          occasions = [...occasions, { label: "Birthday", date: extracted.birthdayDate }];
        }
        return {
          id: crypto.randomUUID(),
          name: p.name.trim(),
          relationship: p.relationship,
          occasions,
          interests: extracted.interests,
          avoidTerms: extracted.avoidTerms,
          budgetCents: extracted.budgetCents,
        } satisfies Recipient;
      }));
      onAdd(built);
      toast.success(built.length > 1 ? `${built.length} people saved` : `${built[0].name} saved`);
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
                {person.occasions.map((occ, i) => {
                  return (
                  <div key={i} className="space-y-1.5">
                    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                      <select value={occ.label} onChange={(e) => updateOccasion(personIndex, i, "label", e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none">
                        {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <OccasionDateInput label={occ.label} value={occ.date} onChange={(iso) => updateOccasion(personIndex, i, "date", iso)} />
                      {person.occasions.length > 1 && (
                        <button type="button" onClick={() => removeOccasion(personIndex, i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <LeadTimeSelect value={occ.leadDays ?? defaultLeadDays} onChange={(days) => updateOccasion(personIndex, i, "leadDays", days)} />
                  </div>
                  );
                })}
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
                <p className="text-xs text-muted-foreground">Your Gift AI reads this and fills in interests and things to avoid automatically.</p>
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
  defaultLeadDays,
}: {
  recipient: Recipient;
  onSave: (updates: Partial<Recipient>) => Promise<{ error: unknown }>;
  onSaveOccasions: (occasions: Occasion[]) => Promise<{ error: unknown }>;
  onClose: () => void;
  defaultLeadDays: number;
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
  const [cancelingOccasionIndex, setCancelingOccasionIndex] = useState<number | null>(null);

  function addOccasion() {
    setOccasions((prev) => [...prev, { label: "Birthday", date: "" }]);
  }
  function removeOccasion(i: number) {
    setOccasions((prev) => prev.filter((_, idx) => idx !== i));
  }
  // A freshly-added row with no id yet is just an unsaved draft -- removing
  // it is "never mind", not "cancelling" anything, so only an existing
  // (already-saved) occasion gets the reason prompt.
  function requestRemoveOccasion(i: number) {
    if (occasions[i]?.id) setCancelingOccasionIndex(i);
    else removeOccasion(i);
  }
  function updateOccasion(i: number, field: keyof Occasion, value: string | number) {
    setOccasions((prev) => prev.map((o, idx) => {
      if (idx !== i) return o;
      const next = { ...o, [field]: value };
      if (field === "label" && LOCKED_OCCASION_LABELS.has(value)) {
        next.date = nextHolidayDateString(value) ?? next.date;
      }
      return next;
    }));
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
      let finalOccasions = occasions.filter((o) => o.date);

      if (aboutText.trim()) {
        const extracted = await extractRecipientProfile(aboutText);
        interests = Array.from(new Set([...interests, ...extracted.interests]));
        avoidTerms = Array.from(new Set([...avoidTerms, ...extracted.avoidTerms]));
        if (!budgetCents && extracted.budgetCents) budgetCents = extracted.budgetCents;
        if (extracted.birthdayDate && !finalOccasions.some((o) => o.label === "Birthday")) {
          finalOccasions = [...finalOccasions, { label: "Birthday", date: extracted.birthdayDate }];
        }
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
        onSaveOccasions(finalOccasions),
      ]);
      if (profileResult.error || occasionsResult.error) {
        setError("Couldn't save your changes. Try again.");
        return;
      }
      toast.success(`${name.trim()} saved`);
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
            {occasions.map((occ, i) => {
              return (
              <div key={occ.id ?? `new-${i}`} className="space-y-1.5">
                <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                  <select value={occ.label} onChange={(e) => updateOccasion(i, "label", e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none">
                    {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <OccasionDateInput label={occ.label} value={occ.date} onChange={(iso) => updateOccasion(i, "date", iso)} />
                  {occasions.length > 1 && (
                    <button type="button" onClick={() => requestRemoveOccasion(i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <LeadTimeSelect value={occ.leadDays ?? defaultLeadDays} onChange={(days) => updateOccasion(i, "leadDays", days)} />
              </div>
              );
            })}

            {cancelingOccasionIndex !== null && (
              <CancelRecipientModal
                name={`${occasions[cancelingOccasionIndex]?.label} for ${recipient.name}`}
                onConfirm={(reason) => {
                  void trackEvent("occasion_removed", { reason, recipientId: recipient.id, occasionId: occasions[cancelingOccasionIndex]?.id, label: occasions[cancelingOccasionIndex]?.label });
                  removeOccasion(cancelingOccasionIndex);
                  setCancelingOccasionIndex(null);
                }}
                onClose={() => setCancelingOccasionIndex(null)}
              />
            )}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Interests</label>
            <input value={interestsText} onChange={(e) => setInterestsText(e.target.value)} placeholder="gardening, coffee, true crime podcasts" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
            <p className="text-xs text-muted-foreground">Comma-separated. This is what Your Gift AI matches gifts against.</p>
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
            <p className="text-xs text-muted-foreground">Your Gift AI adds whatever it finds here on top of the fields above.</p>
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
    .map((o) => ({ ...o, parsed: nextOccurrenceDate(o.date, today) }))
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];
  const daysUntil = upcoming ? Math.ceil((upcoming.parsed.getTime() - today.getTime()) / 86400000) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full givit-gradient text-base font-bold text-white">
            {initials(recipient.name)}
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

const CANCEL_REASONS = ["No longer close", "Passed away", "Other"] as const;

// A silent delete loses real signal (are people actually drifting apart, or
// is this AutoGift misfiring?) and, for a loss, is a jarring way for the
// product to just shrug. Asking why costs one extra click and lets the
// passed-away case offer something more useful than nothing.
function CancelRecipientModal({ name, onConfirm, onClose }: { name: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [, navigate] = useLocation();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-givit-ink">Remove {name}?</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Mind sharing why? It helps us get AutoGift right.</p>
        <div className="mt-3 space-y-1.5">
          {CANCEL_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-givit-ember has-[:checked]:bg-givit-ember/5">
              <input type="radio" name="cancel-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-givit-ember" />
              {r}
            </label>
          ))}
        </div>

        {reason === "Passed away" && (
          <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs leading-5 text-muted-foreground">We're sorry for your loss. If it helps, we can point you to a sympathy gift instead.</p>
            <button
              type="button"
              onClick={() => { onConfirm(reason); navigate("/products?q=sympathy%20gift"); }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-givit-ember hover:underline"
            >
              <Flower2 className="h-3.5 w-3.5" /> Find a sympathy gift
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
          <button type="button" onClick={() => onConfirm(reason)} className="rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-white hover:bg-destructive/90">Remove</button>
        </div>
      </div>
    </div>
  );
}

type ImportRow = ParsedCalendarEvent & { selected: boolean; name: string; occasion: string };

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
}

// Google Calendar OAuth is live (see api/auth/google-calendar/*) — this is
// the "reconnect any time" path once a person's actually granted access.
// The .ics upload below stays as the zero-account fallback for Apple/Outlook
// users, or for anyone who'd rather not connect an account at all.
function GoogleCalendarConnect() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/calendar/status")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setStatus(data.connected ? "connected" : "disconnected"); })
      .catch(() => { if (!cancelled) setStatus("disconnected"); });
    return () => { cancelled = true; };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const res = await authedFetch("/api/auth/google-calendar/callback", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Couldn't start connect.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't connect Google Calendar.");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await authedFetch("/api/auth/google-calendar/callback", { method: "DELETE" });
      setStatus("disconnected");
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Couldn't disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      const res = await authedFetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed.");
      toast.success(`Synced: ${data.peopleCreated} new ${data.peopleCreated === 1 ? "person" : "people"}, ${data.occasionsAdded} date${data.occasionsAdded === 1 ? "" : "s"} added.`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast.error(err.message || "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-givit-ink">Google Calendar</p>
          <p className="text-xs text-muted-foreground">{status === "connected" ? "Connected — stays in sync until you disconnect." : "Connect once, sync any time."}</p>
        </div>
        {status === "connected" ? (
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => void syncNow()} disabled={busy} size="sm" className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">Sync now</Button>
            <Button onClick={() => void disconnect()} disabled={busy} variant="outline" size="sm" className="rounded-full">Disconnect</Button>
          </div>
        ) : (
          <Button onClick={() => void connect()} disabled={busy} size="sm" className="shrink-0 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">Connect</Button>
        )}
      </div>
    </div>
  );
}

function CalendarImportModal({
  recipients,
  onImportNew,
  onAddOccasionToExisting,
  onClose,
}: {
  recipients: Recipient[];
  onImportNew: (recipients: Recipient[]) => void;
  onAddOccasionToExisting: (recipientId: string, occasions: Occasion[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const events = parseIcs(String(reader.result || ""));
      if (events.length === 0) {
        toast.error("No events found in that file.");
        return;
      }
      setRows(events.map((e) => ({ ...e, selected: e.guessedOccasion !== "Other", name: e.guessedName, occasion: e.guessedOccasion })));
    };
    reader.readAsText(file);
  }

  function updateRow(i: number, updates: Partial<ImportRow>) {
    setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)) : prev));
  }

  async function handleImport() {
    if (!rows) return;
    const selected = rows.filter((r) => r.selected && r.name.trim());
    if (selected.length === 0) { onClose(); return; }
    setImporting(true);
    try {
      const newRecipients: Recipient[] = [];
      for (const row of selected) {
        const occasion: Occasion = { label: row.occasion, date: row.date };
        const existing = recipients.find((r) => r.name.trim().toLowerCase() === row.name.trim().toLowerCase());
        if (existing) {
          const already = existing.occasions.some((o) => o.label === occasion.label && o.date === occasion.date);
          if (!already) onAddOccasionToExisting(existing.id, [...existing.occasions, occasion]);
        } else {
          const dup = newRecipients.find((r) => r.name.trim().toLowerCase() === row.name.trim().toLowerCase());
          if (dup) dup.occasions.push(occasion);
          else newRecipients.push({ id: crypto.randomUUID(), name: row.name.trim(), relationship: "", occasions: [occasion], interests: [], avoidTerms: [] });
        }
      }
      if (newRecipients.length > 0) onImportNew(newRecipients);
      toast.success(`Imported ${selected.length} date${selected.length !== 1 ? "s" : ""}`);
      onClose();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Import from calendar</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!rows ? (
          <div className="space-y-4 p-5">
            <GoogleCalendarConnect />

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <p className="text-sm text-muted-foreground">
              Export a .ics file from Google Calendar, Apple Calendar, or Outlook (most have a "Birthdays" calendar you can export separately) and drop it here. It's parsed right in your browser, nothing is uploaded anywhere else.
            </p>
            <input ref={fileRef} type="file" accept=".ics,text/calendar" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-center transition hover:border-givit-ember/40 hover:bg-givit-sand/40"
            >
              <CalendarPlus className="h-6 w-6 text-givit-ember" />
              <span className="text-sm font-semibold text-givit-ink">Choose a .ics file</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">Found {rows.length} event{rows.length !== 1 ? "s" : ""}. Uncheck anything you don't want, and fix any names GIVIT guessed wrong.</p>
            <div className="max-h-[45vh] space-y-2 overflow-y-auto">
              {rows.map((row, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-md border p-2 ${row.selected ? "border-border" : "border-border/40 opacity-60"}`}>
                  <input type="checkbox" checked={row.selected} onChange={(e) => updateRow(i, { selected: e.target.checked })} className="accent-givit-ember" />
                  <input value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none" />
                  <select value={row.occasion} onChange={(e) => updateRow(i, { occasion: e.target.value })} className="h-8 rounded-md border border-border bg-background px-1.5 text-xs outline-none">
                    {OCCASION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
              <Button onClick={handleImport} disabled={importing} className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                {importing ? "Importing…" : `Import ${rows.filter((r) => r.selected).length}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const { user, profile, loading } = useAuth();
  const defaultLeadDays = profile?.default_reminder_lead_days ?? 35;
  const { recipients, localReady, saveRecipients, deleteRecipient, updateRecipient, updateOccasions, toggleAutomation } = useRecipients(user, defaultLeadDays);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const editingRecipient = editingId ? recipients.find((r) => r.id === editingId) : null;
  const cancelingRecipient = cancelingId ? recipients.find((r) => r.id === cancelingId) : null;

  // Landing back here is how the Google OAuth redirect (api/auth/google-
  // calendar/callback) reports success/failure -- there's no other channel
  // back to the SPA from a full-page redirect Google itself controls.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar");
    if (!result) return;
    if (result === "connected") { setShowImport(true); toast.success("Google Calendar connected. Hit \"Sync now\" to pull in birthdays."); }
    else if (result === "denied") toast("Google Calendar wasn't connected.");
    else if (result === "error") toast.error("Couldn't connect Google Calendar. Try again.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

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
            <p className="text-sm leading-6 text-white/70">Save the people you care about once. Your Gift AI keeps their interests, budgets, and dates so you never start from zero.</p>
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
          defaultLeadDays={defaultLeadDays}
        />
      )}

      {cancelingRecipient && (
        <CancelRecipientModal
          name={cancelingRecipient.name}
          onConfirm={(reason) => {
            void trackEvent("recipient_removed", { reason, recipientId: cancelingRecipient.id });
            void deleteRecipient(cancelingRecipient.id);
            toast.success(`${cancelingRecipient.name} removed`);
            setCancelingId(null);
          }}
          onClose={() => setCancelingId(null)}
        />
      )}

      {editingRecipient && (
        <EditRecipientModal
          recipient={editingRecipient}
          onSave={(updates) => updateRecipient(editingRecipient.id, updates)}
          onSaveOccasions={(occasions) => updateOccasions(editingRecipient.id, occasions)}
          onClose={() => setEditingId(null)}
          defaultLeadDays={defaultLeadDays}
        />
      )}

      {showImport && (
        <CalendarImportModal
          recipients={recipients}
          onImportNew={(added) => void saveRecipients([...recipients, ...added])}
          onAddOccasionToExisting={(id, occasions) => void updateOccasions(id, occasions)}
          onClose={() => setShowImport(false)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">People</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">The people you care about</h1>
          <p className="mt-1 text-sm text-muted-foreground">Interests, budgets, and dates: saved once, remembered by Your Gift AI every time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowImport(true)} variant="outline" className="rounded-full">
            <CalendarPlus className="h-4 w-4" /> Import from calendar
          </Button>
          <Button onClick={() => setShowModal(true)} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Plus className="h-4 w-4" /> Add person
          </Button>
        </div>
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
              onDelete={() => setCancelingId(r.id)}
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
