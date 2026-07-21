import { useEffect, useState } from "react";
import { createNotification, getGiftRecipients, saveGiftOccasion, saveGiftRecipient, deleteGiftRecipient } from "@/lib/supabase/db";
import type { User } from "@supabase/supabase-js";

export type Occasion = { label: string; date: string };
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
const NOTIFICATION_LEAD_DAYS = 35; // 5 weeks before

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

function scheduledSurveySendAt(occasionDate: string) {
  const date = new Date(`${occasionDate}T12:00:00`);
  date.setDate(date.getDate() - NOTIFICATION_LEAD_DAYS);
  date.setUTCHours(15, 0, 0, 0);
  return date;
}

function generateNotifications(recipients: Recipient[]): ConciergeNotification[] {
  const existing = getStoredNotifications();
  const existingKeys = new Set(existing.map((n) => `${n.recipientName}-${n.occasion}-${n.date}`));
  const now = new Date();
  const newNotifications: ConciergeNotification[] = [];

  for (const r of recipients) {
    for (const o of r.occasions) {
      const key = `${r.name}-${o.label}-${o.date}`;
      if (existingKeys.has(key)) continue;
      const occDate = new Date(o.date);
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
  saveStoredNotifications(merged);
  return merged;
}

/**
 * Single source of truth for saved recipients + their reminder
 * notifications, shared by /people (CRUD) and /concierge (calendar +
 * reminders) so both pages read the same real Supabase data instead of
 * each maintaining its own copy.
 */
export function useRecipients(user: User | null | undefined) {
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
              occasions: (row.gift_occasions ?? []).map((occ: any) => ({ label: occ.occasion, date: occ.occasion_date })),
              interests: row.interests ?? [],
              avoidTerms: row.avoid_terms ?? [],
              budgetCents: row.default_budget_cents ?? null,
              notes: row.notes ?? null,
              automationEnabled: row.automation_enabled ?? true,
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
    load();
    return () => { cancelled = true; };
  }, [user]);

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
    setRecipients((prev) => prev.map((r) => (r.id === id ? next : r)));
    window.localStorage.setItem("givit-recipients", JSON.stringify(recipients.map((r) => (r.id === id ? next : r))));
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
    toggleAutomation,
    dismissNotification,
  };
}
