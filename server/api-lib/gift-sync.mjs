// Server-side equivalent of the create-or-merge logic in the client's .ics
// import (people.tsx's CalendarImportModal) -- there's no browser `recipients`
// state to work against here, so this reads/writes gift_recipients and
// gift_occasions directly via Supabase REST.
import { restFetch } from "./supabase-rest.mjs";

export async function getDefaultLeadDays(userId) {
  const rows = await restFetch(`profiles?id=eq.${userId}&select=default_reminder_lead_days`);
  return rows?.[0]?.default_reminder_lead_days ?? 35;
}

export async function getExistingRecipients(userId) {
  return restFetch(`gift_recipients?user_id=eq.${userId}&select=*,gift_occasions(*)`);
}

// events: [{ name, label, date }] already deduped/normalized by the caller.
// Returns counts for the sync response, not the full data -- the client
// re-fetches its own recipients list separately after a sync.
export async function mergeCalendarEvents(userId, events) {
  const existing = await getExistingRecipients(userId);
  const defaultLeadDays = await getDefaultLeadDays(userId);
  const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r]));

  let created = 0;
  let occasionsAdded = 0;

  for (const event of events) {
    const nameKey = event.name.trim().toLowerCase();
    let recipient = byName.get(nameKey);

    if (!recipient) {
      const [inserted] = await restFetch("gift_recipients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ user_id: userId, name: event.name.trim(), automation_enabled: false }),
      });
      recipient = { ...inserted, gift_occasions: [] };
      byName.set(nameKey, recipient);
      created++;
    }

    const already = (recipient.gift_occasions ?? []).some(
      (o) => o.occasion === event.label && o.occasion_date === event.date,
    );
    if (already) continue;

    const [occasion] = await restFetch("gift_occasions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        recipient_id: recipient.id,
        occasion: event.label,
        occasion_date: event.date,
        repeats_yearly: true,
        approval_lead_days: defaultLeadDays,
      }),
    });
    recipient.gift_occasions = [...(recipient.gift_occasions ?? []), occasion];
    occasionsAdded++;
  }

  return { peopleCreated: created, occasionsAdded };
}
