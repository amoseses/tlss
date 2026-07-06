import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Bell, Calendar, Gift, Plus, Sparkles, Trash2, Users, X, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { getTodaySpecialDate } from "@/lib/data/special-dates";
import { createNotification, getGiftRecipients, saveGiftOccasion, saveGiftRecipient } from "@/lib/supabase/db";
import { AutoGiftOnboardingWizard } from "@/components/autogift/autogift-onboarding-wizard";
import { GiftSurveyModal } from "@/components/autogift/autogift-survey-modal";

type Occasion = { label: string; date: string };
type Recipient = { id: string; name: string; relationship: string; occasions: Occasion[] };

const RELATIONSHIPS = ["Parent", "Partner", "Sibling", "Friend", "Colleague", "Child", "Other"];
const OCCASION_TYPES = ["Birthday", "Anniversary", "Christmas", "Mother's Day", "Father's Day", "Graduation", "Valentine's Day", "Other"];

const NOTIFICATION_KEY = "givit-notifications";
const NOTIFICATION_LEAD_DAYS = 35; // 5 weeks before

type Notification = {
  id: string;
  recipientName: string;
  occasion: string;
  date: string;
  daysUntil: number;
  dismissed: boolean;
  createdAt: string;
};

function getNotifications(): Notification[] {
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFICATION_KEY) ?? "[]");
  } catch { return []; }
}

function saveNotifications(notifications: Notification[]) {
  window.localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
}

function scheduledSurveySendAt(occasionDate: string) {
  const date = new Date(`${occasionDate}T12:00:00`);
  date.setDate(date.getDate() - NOTIFICATION_LEAD_DAYS);
  // 10:00 AM America/New_York is 15:00 UTC during EST and 14:00 UTC during EDT.
  // Store 15:00Z so backend schedulers have a deterministic 10am EST target.
  date.setUTCHours(15, 0, 0, 0);
  return date;
}

function generateNotifications(recipients: Recipient[]): Notification[] {
  const existing = getNotifications();
  const existingKeys = new Set(existing.map(n => `${n.recipientName}-${n.occasion}-${n.date}`));
  const now = new Date();
  const newNotifications: Notification[] = [];

  for (const r of recipients) {
    for (const o of r.occasions) {
      const key = `${r.name}-${o.label}-${o.date}`;
      if (existingKeys.has(key)) continue;
      
      const occDate = new Date(o.date);
      const leadDate = scheduledSurveySendAt(o.date);
      const daysUntil = Math.ceil((occDate.getTime() - now.getTime()) / 86400000);
      
      if (daysUntil > 0 && daysUntil <= NOTIFICATION_LEAD_DAYS + 7) {
        newNotifications.push({
          id: crypto.randomUUID(),
          recipientName: r.name,
          occasion: o.label,
          date: o.date,
          daysUntil,
          dismissed: false,
          createdAt: now.toISOString(),
        });
      }
    }
  }

  const merged = [...newNotifications, ...existing];
  saveNotifications(merged);
  return merged;
}

function AddRecipientModal({ onAdd, onClose }: { onAdd: (recipients: Recipient[]) => void; onClose: () => void }) {
  type PersonForm = { name: string; relationship: string; occasions: Occasion[] };
  const emptyPerson = (): PersonForm => ({ name: "", relationship: "", occasions: [{ label: "Birthday", date: "" }] });
  const [people, setPeople] = useState<PersonForm[]>([emptyPerson()]);

  // Dates are added in the occasions section below so this dialog only asks once.


  function addPerson() {
    setPeople((prev) => [...prev, emptyPerson()]);
  }

  function removePerson(i: number) {
    setPeople((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePerson(i: number, field: keyof PersonForm, value: string) {
    setPeople((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  function addOccasion(personIndex: number) {
    setPeople((prev) => prev.map((p, idx) => idx === personIndex ? { ...p, occasions: [...p.occasions, { label: "Birthday", date: "" }] } : p));
  }

  function removeOccasion(personIndex: number, occIndex: number) {
    setPeople((prev) => prev.map((p, idx) => idx === personIndex ? { ...p, occasions: p.occasions.filter((_, oi) => oi !== occIndex) } : p));
  }

  function updateOccasion(personIndex: number, occIndex: number, field: keyof Occasion, value: string) {
    setPeople((prev) => prev.map((p, idx) => {
      if (idx !== personIndex) return p;
      const occasions = [...p.occasions];
      occasions[occIndex] = { ...occasions[occIndex], [field]: value };
      return { ...p, occasions };
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = people.filter((p) => p.name.trim());
    if (valid.length === 0) return;
    onAdd(valid.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name.trim(),
      relationship: p.relationship,
      occasions: p.occasions.filter((o) => o.date),
    })));
    onClose();
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
            </div>
          ))}

          <button type="button" onClick={addPerson} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border/60 py-3 text-sm font-semibold text-givit-ember transition hover:border-givit-ember/40">
            <Plus className="h-4 w-4" /> Add another person
          </button>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-md" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">Save {people.filter((p) => p.name.trim()).length || ""} recipient{people.filter((p) => p.name.trim()).length !== 1 ? "s" : ""}</Button>
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

      <div className="rounded-lg border border-givit-ember/20 bg-givit-ember/5 p-2.5 text-xs leading-5 text-muted-foreground">
        <p className="font-semibold text-givit-ink">Gift options you approve first</p>
        <p>Givit AI builds thoughtful bundles, shows exact pricing, and waits for your approval before anything is charged or ordered.</p>
      </div>

      <Link href={`/autogift/recommend?recipient=${encodeURIComponent(recipient.name)}&relationship=${encodeURIComponent(recipient.relationship)}&occasion=${encodeURIComponent(upcoming?.label ?? recipient.occasions[0]?.label ?? "")}&date=${encodeURIComponent(upcoming?.date ?? recipient.occasions[0]?.date ?? "")}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-givit-ember/30 py-1.5 text-xs font-semibold text-givit-ember transition hover:bg-givit-ember/5">
        <Sparkles className="h-3 w-3" /> Find a gift now
      </Link>
    </div>
  );
}

export default function ConciergePage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();
  const [localReady, setLocalReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [surveyNotification, setSurveyNotification] = useState<Notification | null>(null);
  const onboardingComplete = Boolean((profile as any)?.concierge_onboarding_completed) || window.localStorage.getItem("givit-autogift-onboarded") === "1";

  // Load DB-backed recipients when signed in, with local fallback for guests/demo.
  useEffect(() => {
    let cancelled = false;
    async function loadRecipients() {
      try {
        if (user) {
          const rows = await getGiftRecipients(user.id);
          if (!cancelled && rows.length > 0) {
            const mapped = rows.map((row: any) => ({
              id: row.id,
              name: row.name,
              relationship: row.relationship || "",
              occasions: (row.gift_occasions ?? []).map((occ: any) => ({ label: occ.occasion, date: occ.occasion_date })),
            })) as Recipient[];
            setRecipients(mapped);
            setNotifications(generateNotifications(mapped));
            setLocalReady(true);
            return;
          }
        }
        const saved = window.localStorage.getItem("givit-recipients");
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved) as Recipient[];
          setRecipients(parsed);
          setNotifications(generateNotifications(parsed));
        }
      } catch (err) {
        console.error("Failed to load AutoGift recipients:", err);
      } finally {
        if (!cancelled) setLocalReady(true);
      }
    }
    loadRecipients();
    return () => { cancelled = true; };
  }, [user]);

  // Require onboarding before anyone can enter AutoGift automation.
  useEffect(() => {
    if (!localReady || loading) return;
    if (!user) {
      if (!window.localStorage.getItem("givit-autogift-onboarded")) setShowOnboarding(true);
      return;
    }
    if (!onboardingComplete) setShowOnboarding(true);
  }, [loading, user, localReady, onboardingComplete]);

  async function saveRecipients(list: Recipient[]) {
    setRecipients(list);
    window.localStorage.setItem("givit-recipients", JSON.stringify(list));
    const notifs = generateNotifications(list);
    setNotifications(notifs);

    if (!user) return;
    const added = list.filter((recipient) => !recipients.some((existing) => existing.id === recipient.id));
    for (const recipient of added) {
      const { data } = await saveGiftRecipient({
        id: recipient.id,
        user_id: user.id,
        name: recipient.name,
        relationship: recipient.relationship || null,
        automation_enabled: true,
      });
      const recipientId = data?.id ?? recipient.id;
      for (const occasion of recipient.occasions.filter((item) => item.date)) {
        const { data: savedOccasion } = await saveGiftOccasion({
          user_id: user.id,
          recipient_id: recipientId,
          occasion: occasion.label,
          occasion_date: occasion.date,
          repeats_yearly: true,
          approval_lead_days: 35,
        });
        const scheduledFor = scheduledSurveySendAt(occasion.date).toISOString();
        await createNotification({
          user_id: user.id,
          recipient_id: recipientId,
          occasion_id: savedOccasion?.id ?? null,
          title: `${recipient.name}'s ${occasion.label} is coming up`,
          body: "AutoGift is ready to email the recipient survey, generate AI recommendations, and ask you to approve before charging your saved card.",
          channel: "email",
          scheduled_for: scheduledFor,
          status: "scheduled",
          metadata: { automation: "autogift", recipientName: recipient.name, occasion: occasion.label, occasionDate: occasion.date },
        });
        await createNotification({
          user_id: user.id,
          recipient_id: recipientId,
          occasion_id: savedOccasion?.id ?? null,
          title: `${recipient.name}'s ${occasion.label} reminder`,
          body: "Open AutoGift to complete the survey and approval flow.",
          channel: "in_app",
          scheduled_for: scheduledFor,
          status: "scheduled",
          metadata: { automation: "autogift", recipientName: recipient.name, occasion: occasion.label, occasionDate: occasion.date },
        });
      }
    }
  }

  function dismissNotification(id: string) {
    const updated = notifications.map(n => n.id === id ? { ...n, dismissed: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  }

  const activeNotifications = notifications.filter(n => !n.dismissed);
  const upcomingAll = recipients
    .flatMap((r) =>
      r.occasions.filter((o) => o.date).map((o) => ({ ...o, recipient: r.name, parsed: new Date(o.date) }))
    )
    .filter((o) => o.parsed >= new Date())
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(0, 5);

  if (loading) {
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
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
          <Bell className="h-10 w-10 text-givit-ember" />
          <h2 className="font-serif text-2xl font-bold text-givit-ink">AutoGift</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Sign in to manage recipients, reminders, and auto-gifting. You can still take the quick onboarding tour.</p>
          <div className="flex gap-3">
            <Button asChild className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover"><Link href="/login">Log in</Link></Button>
            <Button onClick={() => setShowOnboarding(true)} variant="outline" className="rounded-lg">Take onboarding tour</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {showOnboarding && (
        <AutoGiftOnboardingWizard
          required={Boolean(user) || !window.localStorage.getItem("givit-autogift-onboarded")}
          onClose={() => {
            setShowOnboarding(false);
          }}
        />
      )}
      {showModal && !showOnboarding && (
        <AddRecipientModal
          onAdd={(added) => void saveRecipients([...recipients, ...added])}
          onClose={() => setShowModal(false)}
        />
      )}
      {surveyNotification && !showOnboarding && (
        <GiftSurveyModal
          recipientName={surveyNotification.recipientName}
          occasion={surveyNotification.occasion}
          occasionDate={surveyNotification.date}
          onClose={() => setSurveyNotification(null)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gift concierge</h1>
        </div>
        <div className="flex gap-2">
          {activeNotifications.length > 0 && (
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                className="rounded-md relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-givit-ember text-[9px] font-bold text-white">
                  {activeNotifications.length}
                </span>
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl">
                  <div className="border-b border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-givit-ember">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {activeNotifications.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">No new notifications</p>
                    ) : (
                      activeNotifications.map((n) => (
                        <div key={n.id} className="flex items-start gap-2 rounded-lg p-2.5 text-xs hover:bg-muted/50">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember">
                            <Bell className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{n.recipientName}'s {n.occasion}</p>
                            <p className="text-muted-foreground">{n.daysUntil} days away</p>
                          </div>
                          <button
                            onClick={() => setSurveyNotification(n)}
                            className="shrink-0 rounded bg-givit-ember px-2 py-1 font-semibold text-white hover:bg-givit-ember-hover"
                          >
                            Survey
                          </button>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Dismiss AutoGift reminder"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <Button onClick={() => setSurveyNotification({ id: "test", recipientName: recipients[0]?.name || "Test Recipient", occasion: recipients[0]?.occasions[0]?.label || "Birthday", date: recipients[0]?.occasions[0]?.date || new Date(Date.now()+35*86400000).toISOString().slice(0,10), daysUntil: 35, dismissed: false, createdAt: new Date().toISOString() })} variant="outline" className="rounded-md">
            <FlaskConical className="h-4 w-4" /> Test AutoGift
          </Button>
          <Button onClick={() => setShowModal(true)} className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Plus className="h-4 w-4" /> Add people
          </Button>
        </div>
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
              <Button onClick={() => setShowOnboarding(true)} variant="outline" className="mt-3 rounded-lg">
                Retake onboarding tour
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipients.map((r) => (
                <RecipientCard
                  key={r.id}
                  recipient={r}
                  onDelete={() => void saveRecipients(recipients.filter((x) => x.id !== r.id))}
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

          <div className="rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/15 to-givit-coral/10 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-givit-ink">How AutoGift works</h2>
                <ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                  <li>1. Add people and their key dates</li>
                  <li>2. 35 days before, we email the survey at 10:00 AM EST</li>
                  <li>3. AI suggests gifts, cards (+$5), flowers (+$25), and activities</li>
                  <li>4. You approve, we charge the saved card, then admin fulfills and ships</li>
                </ol>
                <div className="mt-3 rounded-lg bg-black/20 p-2.5 text-xs">
                  <p className="font-semibold text-givit-ink">Pricing</p>
                  <p className="mt-1 text-muted-foreground">Calculated only after AI builds a tailored bundle. You approve before any charge.</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button asChild className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover text-xs h-9 w-full">
                <Link href="/gift"><Gift className="h-3.5 w-3.5" /> Find a gift now!</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}