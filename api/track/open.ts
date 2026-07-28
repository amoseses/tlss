/// <reference path="../mjs-modules.d.ts" />
// Tracking pixel embedded in reminder emails (see dispatch-notifications.ts)
// so dispatch-followups.ts can tell "sent but ignored" apart from "sent and
// read" — without this, a follow-up nudge would have no real signal to act
// on and would just be a second copy of the same email on a timer.
import { markNotificationOpened } from "../_lib/notifications.mjs";

// Smallest valid transparent GIF — a real image response, so this loads
// silently as the intended 1x1 pixel instead of a broken-image icon on mail
// clients that render alt text or a placeholder for failed image requests.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

export default async function handler(req: any, res: any) {
  const id = req.query?.id;
  if (typeof id === "string" && id) {
    // Awaited, not fire-and-forget: a Vercel function can be frozen the
    // instant the response is sent, which would silently drop an
    // un-awaited write before it reaches Supabase.
    await markNotificationOpened(id).catch(() => null);
  }
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).send(PIXEL);
}
