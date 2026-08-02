/// <reference path="../mjs-modules.d.ts" />
// Actually sends the AutoGift reminders that createNotification() schedules
// into gift_notifications — until this existed, "email"/"push" channel rows
// just sat in the table forever with status='scheduled' and nothing ever
// dispatched them. Vercel Cron hits this on a schedule (see vercel.json);
// it can also be triggered manually with the same bearer token for testing.
import { fetchDueNotifications, fetchProfilesByIds, fetchPushSubscriptions, markNotificationStatus } from "../_lib/notifications.mjs";
import { sendEmail } from "../_lib/email.mjs";
import { sendPushToSubscription } from "../_lib/push.mjs";
import { sendSms } from "../_lib/sms.mjs";

function emailBody(title: string, body: string, notificationId?: string) {
  // Invisible 1x1 pixel so dispatch-followups.ts can tell whether this
  // specific reminder was ever opened before deciding to nudge again.
  const pixel = notificationId
    ? `<img src="https://givit.site/api/track/open?id=${encodeURIComponent(notificationId)}" width="1" height="1" alt="" style="display:none" />`
    : "";
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c2542a">Givit</p>
    <h1 style="font-size:20px;margin:8px 0">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#444">${body}</p>
    <a href="https://givit.site/concierge" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#c2542a;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600">Open AutoGift</a>
    ${pixel}
  </div>`;
  return { html, text: `${title}\n\n${body}\n\nOpen AutoGift: https://givit.site/concierge` };
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

  const results = { sent: 0, failed: 0, skipped: 0 };

  try {
    const due = await fetchDueNotifications();
    if (!Array.isArray(due) || due.length === 0) {
      res.status(200).json({ ok: true, ...results, message: "Nothing due." });
      return;
    }

    const userIds = Array.from(new Set(due.map((n: any) => n.user_id).filter(Boolean)));
    const profiles = await fetchProfilesByIds(userIds);
    const emailByUserId = new Map(profiles.map((p: any) => [p.id, p.email]));
    const phoneByUserId = new Map(profiles.map((p: any) => [p.id, p.phone]));

    for (const notification of due) {
      try {
        if (notification.channel === "email") {
          const to = emailByUserId.get(notification.user_id);
          if (!to) {
            await markNotificationStatus(notification.id, "failed");
            results.failed++;
            continue;
          }
          const { html, text } = emailBody(notification.title, notification.body, notification.id);
          await sendEmail({ to, subject: notification.title, html, text });
          await markNotificationStatus(notification.id, "sent");
          results.sent++;
        } else if (notification.channel === "sms") {
          const phone = phoneByUserId.get(notification.user_id);
          if (!phone) {
            await markNotificationStatus(notification.id, "failed");
            results.failed++;
            continue;
          }
          await sendSms(phone, `${notification.title} — ${notification.body}`);
          await markNotificationStatus(notification.id, "sent");
          results.sent++;
        } else if (notification.channel === "push" || notification.channel === "in_app") {
          const subscriptions = await fetchPushSubscriptions(notification.user_id);
          if (!subscriptions || subscriptions.length === 0) {
            results.skipped++;
            await markNotificationStatus(notification.id, "sent");
            continue;
          }
          await Promise.all(
            subscriptions.map((sub: any) =>
              sendPushToSubscription(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                { title: notification.title, body: notification.body, url: "/concierge" },
              ).catch(() => null),
            ),
          );
          await markNotificationStatus(notification.id, "sent");
          results.sent++;
        } else {
          results.skipped++;
        }
      } catch (error: any) {
        console.error(`dispatch-notifications: failed to send ${notification.id}`, error?.message);
        await markNotificationStatus(notification.id, "failed").catch(() => null);
        results.failed++;
      }
    }

    res.status(200).json({ ok: true, ...results, total: due.length });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "dispatch-notifications failed" });
  }
}
