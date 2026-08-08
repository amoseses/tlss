/// <reference path="../mjs-modules.d.ts" />
// Pulls birthday/anniversary-shaped events off the user's connected Google
// Calendar and merges them into gift_recipients/gift_occasions. Triggered
// on-demand (a "Sync now" button) rather than a background cron for this
// first pass -- keeps the token-refresh and write logic in one place we can
// verify actually works before wiring it to run unattended on a schedule.
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { getConnection, deleteConnection, markSynced } from "../../server/api-lib/calendar-connections.mjs";
import { refreshAccessToken, fetchCalendarList, fetchEvents } from "../../server/api-lib/google-calendar.mjs";
import { guessName, guessOccasion, eventDateIso } from "../../server/api-lib/calendar-parse.mjs";
import { mergeCalendarEvents } from "../../server/api-lib/gift-sync.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }

  try {
    const connection = await getConnection(user.id);
    if (!connection) {
      res.status(400).json({ error: "Google Calendar isn't connected." });
      return;
    }

    let accessToken: string;
    try {
      const refreshed = await refreshAccessToken(connection.refresh_token);
      accessToken = refreshed.access_token;
    } catch (err: any) {
      // A refresh failure almost always means the user revoked access from
      // Google's side -- the stored token is now dead weight, not something
      // worth retrying.
      await deleteConnection(user.id).catch(() => null);
      res.status(400).json({ error: "Google Calendar access was revoked. Please reconnect." });
      return;
    }

    const calendars = await fetchCalendarList(accessToken);
    const relevant = calendars.filter(
      (c: any) => c.primary || /contact|birthday/i.test(c.id) || /birthday/i.test(c.summary || ""),
    );
    const targets = relevant.length > 0 ? relevant : calendars.slice(0, 1);

    // Wide enough that every yearly-recurring event has at least one
    // expanded instance inside the window, regardless of what month it
    // falls in relative to today.
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), 0, 1).toISOString();
    const timeMax = new Date(now.getFullYear() + 2, 0, 1).toISOString();

    const seen = new Map<string, { name: string; label: string; date: string }>();
    for (const calendar of targets) {
      let events: any[] = [];
      try {
        events = await fetchEvents(accessToken, calendar.id, timeMin, timeMax);
      } catch {
        continue; // one bad calendar (e.g. no read access) shouldn't kill the whole sync
      }
      for (const event of events) {
        const summary = event.summary;
        if (!summary) continue;
        const occasion = guessOccasion(summary);
        if (occasion === "Other") continue; // conservative: only auto-import clear birthday/anniversary matches
        const date = eventDateIso(event);
        if (!date) continue;
        const name = guessName(summary);
        const key = `${name.toLowerCase()}|${occasion}`;
        const existingSeen = seen.get(key);
        if (!existingSeen || date < existingSeen.date) {
          seen.set(key, { name, label: occasion, date });
        }
      }
    }

    const result = await mergeCalendarEvents(user.id, Array.from(seen.values()));
    await markSynced(user.id);
    res.status(200).json({ ok: true, ...result, calendarsChecked: targets.length });
  } catch (error: any) {
    console.error("calendar sync failed:", error?.message);
    res.status(500).json({ error: error?.message ?? "Sync failed." });
  }
}
