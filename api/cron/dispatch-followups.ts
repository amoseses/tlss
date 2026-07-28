/// <reference path="../mjs-modules.d.ts" />
// A reminder email that's never opened is easy to miss entirely — this
// finds AutoGift reminder emails sent 72+ hours ago with no open recorded
// (via the tracking pixel in dispatch-notifications.ts) and no follow-up
// sent yet, and sends exactly one nudge. Deliberately separate from
// dispatch-notifications.ts rather than folded into it: this reads
// already-sent notifications by open status, not scheduled ones by time,
// a different enough query that keeping them apart is clearer than
// branching one handler on two unrelated conditions.
import { fetchUnopenedEmailNotifications, fetchProfilesByIds, markFollowupSent } from "../_lib/notifications.mjs";
import { sendEmail } from "../_lib/email.mjs";

const UNOPENED_AFTER_HOURS = 72;

function followupBody(title: string, body: string) {
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c2542a">Givit</p>
    <h1 style="font-size:20px;margin:8px 0">Still there? ${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#444">We sent this a few days ago and wanted to make sure it didn't get buried. ${body}</p>
    <a href="https://givit.site/concierge" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#c2542a;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600">Open AutoGift</a>
  </div>`;
  return { html, text: `Still there? ${title}\n\nWe sent this a few days ago and wanted to make sure it didn't get buried. ${body}\n\nOpen AutoGift: https://givit.site/concierge` };
}

export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers?.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const results = { sent: 0, failed: 0 };

  try {
    const unopened = await fetchUnopenedEmailNotifications(UNOPENED_AFTER_HOURS);
    if (!Array.isArray(unopened) || unopened.length === 0) {
      res.status(200).json({ ok: true, ...results, message: "Nothing to follow up on." });
      return;
    }

    const userIds = Array.from(new Set(unopened.map((n: any) => n.user_id).filter(Boolean)));
    const profiles = await fetchProfilesByIds(userIds);
    const emailByUserId = new Map(profiles.map((p: any) => [p.id, p.email]));

    for (const notification of unopened) {
      try {
        const to = emailByUserId.get(notification.user_id);
        if (!to) {
          results.failed++;
          continue;
        }
        const { html, text } = followupBody(notification.title, notification.body);
        await sendEmail({ to, subject: `Still there? ${notification.title}`, html, text });
        await markFollowupSent(notification.id);
        results.sent++;
      } catch (error: any) {
        console.error(`dispatch-followups: failed to send follow-up for ${notification.id}`, error?.message);
        results.failed++;
      }
    }

    res.status(200).json({ ok: true, ...results, total: unopened.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "dispatch-followups failed" });
  }
}
