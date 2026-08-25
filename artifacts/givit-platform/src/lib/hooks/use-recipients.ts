import { useEffect, useState } from "react";
import { createNotification, deleteGiftOccasion, getGiftRecipients, saveGiftOccasion, saveGiftRecipient, deleteGiftRecipient } from "@/lib/supabase/db";
import { nextOccurrenceDate } from "@/lib/date-utils";
import type { User } from "@supabase/supabase-js";

export { nextOccurrenceDate };

export type Occasion = { id?: string; label: string; date: string; leadDays?: number };
export type Recipient = {
  id: string;
  name: string;
  relationship: string;
  occasions: Occasion[];
  interests?: string[];
  avoidTerms?: string[];
  budgetCents?: number | null;
  notes?: string | null;
  automationEnabled?: boolean;
};

const NOTIFICATION_KEY = "givit-notifications";
const NOTIFICATION_LEAD_DAYS = 35; // 5 weeks before -- default when an occasion doesn't set its own
export const MIN_LEAD_DAYS = 7; // 1 week -- below this, standard shipping usually can't make the date

export type ConciergeNotification = {
  id: string;
  recipientName: string;
  occasion: string;
  date: string;
  daysUntil: number;
  dismissed: boolean;
  createdAt: string;
};

function getStoredNotifications(): ConciergeNotification[] {
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFICATION_KEY) ?? "[]");
  } catch { return []; }
}

function saveStoredNotifications(notifications: ConciergeNotification[]) {
  window.localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
}

function scheduledSurveySendAt(occasionDate: string, leadDays: number) {
  const date = nextOccurrenceDate(occasionDate);
  date.setDate(date.getDate() - leadDays);
  date.setUTCHours(15, 0, 0, 0);
  return date;
}

// The one place that actually schedules a real (DB-backed) reminder for an
// occasion — every caller that adds or changes an occasion date must go
// through this, or that occasion silently never gets an email/push
// reminder even though the UI looks like it saved fine.
async function scheduleOccasionNotifications(
  userId: string,
  recipientId: string,
  recipientName: string,
  occasion: Occasion,
) {
  const leadDays = occasion.leadDays ?? NOTIFICATION_LEAD_DAYS;
  const scheduledFor = scheduledSurveySendAt(occasion.date, leadDays).toISOString();
  await createNotification({
    user_id: userId,
    recipient_id: recipientId,
    occasion_id: occasion.id ?? null,
    title: `${recipientName}'s ${occasion.label} is coming up`,
    body: "AutoGift is ready to email the recipient survey, generate AI recommendations, and ask you to approve before charging your saved card.",
    channel: "email",
    scheduled_for: scheduledFor,
    status: "scheduled",
    metadata: { automation: "autogift", recipientName, occasion: occasion.label, occasionDate: occasion.date },
  });
  await createNotification({
    user_id: userId,
    recipient_id: recipientId,
    occasion_id: occasion.id ?? null,
    title: `${recipientName}'s ${occasion.label} reminder`,
    body: "Open AutoGift to complete the survey and approval flow.",
    channel: "in_app",
    scheduled_for: scheduledFor,
    status: "scheduled",
    metadata: { automation: "autogift", recipientName, occasion: occasion.label, occasionDate: occasion.date },
  });
}

function generateNotifications(recipients: Recipient[], defaultLeadDays = NOTIFICATION_LEAD_DAYS): ConciergeNotification[] {
  const existing = getStoredNotifications();
  const existingKeys = new Set(existing.map((n) => `${n.recipientName}-${n.occasion}-${n.date}`));
  const now = new Date();
  const newNotifications: ConciergeNotification[] = [];

  for (const r of recipients) {
    for (const o of r.occasions) {
      const key = `${r.name}-${o.label}-${o.date}`;
      if (existingKeys.has(key)) continue;
      const occDate = nextOccurrenceDate(o.date, now);
      const daysUntil = Math.ceil((occDate.getTime() - now.getTime()) / 86400000);
      const leadDays = o.leadDays ?? defaultLeadDays;
      if (daysUntil > 0 && daysUntil <= leadDays + 7) {
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
  saveStoredNotifications(merged);
  return merged;
}

/**
 * Single source of truth for saved recipients + their reminder
 * notifications, shared by /people (CRUD) and /concierge (calendar +
 * reminders) so both pages read the same real Supabase data instead of
 * each maintaining its own copy.
 */
export function useRecipients(user: { id: string; email?: string } | User | null | undefined, defaultLeadDays: number = NOTIFICATION_LEAD_DAYS) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [notifications, setNotifications] = useState<ConciergeNotification[]>([]);
  const [localReady, setLocalReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (user) {
          const rows = await getGiftRecipients(user.id);
          if (!cancelled && rows.length > 0) {
            const mapped = rows.map((row: any) => ({
              id: row.id,
              name: row.name,
              relationship: row.relationship || "",
              occasions: (row.gift_occasions ?? []).map((occ: any) => ({ id: occ.id, label: occ.occasion, date: occ.occasion_date, leadDays: occ.approval_lead_days ?? defaultLeadDays })),
              interests: row.interests ?? [],
              avoidTerms: row.avoid_terms ?? [],
              budgetCents: row.default_budget_cents ?? null,
              notes: row.notes ?? null,
              automationEnabled: row.automation_enabled ?? true,
            })) as Recipient[];
            setRecipients(mapped);
            setNotifications(generateNotifications(mapped, defaultLeadDays));
            setLocalReady(true);
            return;
          }
        }
        const saved = window.localStorage.getItem("givit-recipients");
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved) as Recipient[];
          setRecipients(parsed);
          setNotifications(generateNotifications(parsed, defaultLeadDays));
        }
      } catch (err) {
        console.error("Failed to load AutoGift recipients:", err);
      } finally {
        if (!cancelled) setLocalReady(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, defaultLeadDays]);

  async function saveRecipients(list: Recipient[]) {
    setRecipients(list);
    window.localStorage.setItem("givit-recipients", JSON.stringify(list));
    setNotifications(generateNotifications(list));

    if (!user) return;
    const added = list.filter((recipient) => !recipients.some((existing) => existing.id === recipient.id));
    for (const recipient of added) {
      const { data } = await saveGiftRecipient({
        id: recipient.id,
        user_id: user.id,
        name: recipient.name,
        relationship: recipient.relationship || null,
        automation_enabled: recipient.automationEnabled ?? true,
        interests: recipient.interests?.length ? recipient.interests : undefined,
        avoid_terms: recipient.avoidTerms?.length ? recipient.avoidTerms : undefined,
        default_budget_cents: recipient.budgetCents ?? undefined,
      });
      const recipientId = data?.id ?? recipient.id;
      for (const occasion of recipient.occasions.filter((item) => item.date)) {
        const leadDays = occasion.leadDays ?? defaultLeadDays;
        const { data: savedOccasion } = await saveGiftOccasion({
          user_id: user.id,
          recipient_id: recipientId,
          occasion: occasion.label,
          occasion_date: occasion.date,
          repeats_yearly: true,
          approval_lead_days: leadDays,
        });
        await scheduleOccasionNotifications(user.id, recipientId, recipient.name, { id: savedOccasion?.id, label: occasion.label, date: occasion.date, leadDays });
      }
    }
  }

  async function deleteRecipient(id: string) {
    const next = recipients.filter((r) => r.id !== id);
    setRecipients(next);
    window.localStorage.setItem("givit-recipients", JSON.stringify(next));
    if (user) {
      const { error } = await deleteGiftRecipient(id);
      if (error) console.error("Failed to delete recipient:", error);
    }
  }

  // saveRecipients() only ever calls saveGiftRecipient() for ids not already
  // in `recipients` (i.e. new people), so editing an existing person's
  // fields through it would update local state but silently never persist
  // to Supabase. This is the actual update path.
  async function updateRecipient(id: string, updates: Partial<Recipient>) {
    const existing = recipients.find((r) => r.id === id);
    if (!existing) return { error: new Error("Recipient not found") };
    const next = { ...existing, ...updates };
    // Functional updater, and localStorage/next both derived from `prev`
    // inside it -- not the `recipients` closed over at call time. The edit
    // modal calls updateRecipient and updateOccasions concurrently
    // (Promise.all), and updateOccasions's own setRecipients call used to
    // rebuild its next array from that same stale closure, silently
    // clobbering whichever field(s) this call had just changed (e.g. a
    // freshly typed interest) the moment it resolved second.
    setRecipients((prev) => {
      const nextAll = prev.map((r) => (r.id === id ? next : r));
      window.localStorage.setItem("givit-recipients", JSON.stringify(nextAll));
      return nextAll;
    });
    if (!user) return { error: null };
    const { error } = await saveGiftRecipient({
      id,
      user_id: user.id,
      name: next.name,
      relationship: next.relationship || null,
      interests: next.interests?.length ? next.interests : [],
      avoid_terms: next.avoidTerms?.length ? next.avoidTerms : [],
      default_budget_cents: next.budgetCents ?? null,
      notes: next.notes ?? null,
      automation_enabled: next.automationEnabled ?? true,
    });
    if (error) {
      console.error("Failed to update recipient:", error);
      setRecipients((prev) => prev.map((r) => (r.id === id ? existing : r)));
    }
    return { error };
  }

  // Occasions with an `id` are existing DB rows (upsert = update in place);
  // ones without an id are new, freshly added in the edit form (upsert
  // without an id lets the DB default generate one). Anything with an id
  // that's no longer in the incoming list was removed in the form and gets
  // actually deleted, not just dropped from local state.
  async function updateOccasions(recipientId: string, occasions: Occasion[]) {
    const recipient = recipients.find((r) => r.id === recipientId);
    if (!recipient) return { error: new Error("Recipient not found") };

    const keptIds = new Set(occasions.map((o) => o.id).filter(Boolean));
    for (const occ of recipient.occasions) {
      if (occ.id && !keptIds.has(occ.id)) {
        const { error } = await deleteGiftOccasion(occ.id);
        if (error) console.error("Failed to delete occasion:", error);
      }
    }

    const saved: Occasion[] = [];
    for (const occ of occasions) {
      if (!occ.date) continue;
      if (!user) { saved.push(occ); continue; }

      // A brand-new occasion, or an existing one whose date or lead time
      // actually changed, needs a fresh reminder scheduled — an unchanged
      // occasion being re-saved (e.g. editing an unrelated field on the
      // same form) should NOT get a duplicate notification row created
      // every time.
      const previous = occ.id ? recipient.occasions.find((o) => o.id === occ.id) : undefined;
      const leadDays = occ.leadDays ?? defaultLeadDays;
      const isNewOrChanged = !occ.id || !previous || previous.date !== occ.date || (previous.leadDays ?? defaultLeadDays) !== leadDays;

      const payload: Record<string, unknown> = {
        user_id: user.id,
        recipient_id: recipientId,
        occasion: occ.label,
        occasion_date: occ.date,
        repeats_yearly: true,
        approval_lead_days: leadDays,
      };
      if (occ.id) payload.id = occ.id;
      const { data, error } = await saveGiftOccasion(payload);
      if (error) {
        console.error("Failed to save occasion:", error);
        saved.push(occ);
        continue;
      }
      const resolved: Occasion = { id: data?.id ?? occ.id, label: occ.label, date: occ.date, leadDays };
      saved.push(resolved);

      if (isNewOrChanged) {
        await scheduleOccasionNotifications(user.id, recipientId, recipient.name, resolved);
      }
    }

    // Functional updater, same reasoning as updateRecipient above: this
    // runs concurrently with it via Promise.all in the edit modal, so
    // building off the `recipients` closed over at call time would silently
    // drop whatever updateRecipient had just changed.
    setRecipients((prev) => {
      const nextAll = prev.map((r) => (r.id === recipientId ? { ...r, occasions: saved } : r));
      window.localStorage.setItem("givit-recipients", JSON.stringify(nextAll));
      setNotifications(generateNotifications(nextAll));
      return nextAll;
    });
    return { error: null };
  }

  async function toggleAutomation(id: string, enabled: boolean) {
    const recipient = recipients.find((r) => r.id === id);
    if (!recipient) return;
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, automationEnabled: enabled } : r)));
    if (!user) return;
    const { error } = await saveGiftRecipient({ id, user_id: user.id, name: recipient.name, automation_enabled: enabled });
    if (error) {
      console.error("Failed to update AutoGift status:", error);
      setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, automationEnabled: !enabled } : r)));
    }
  }

  function dismissNotification(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n));
    setNotifications(updated);
    saveStoredNotifications(updated);
  }

  return {
    recipients,
    notifications,
    activeNotifications: notifications.filter((n) => !n.dismissed),
    localReady,
    saveRecipients,
    deleteRecipient,
    updateRecipient,
    updateOccasions,
    toggleAutomation,
    dismissNotification,
  };
}
