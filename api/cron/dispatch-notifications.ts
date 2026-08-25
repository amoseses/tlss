/// <reference path="../mjs-modules.d.ts" />
// Actually sends the AutoGift reminders that createNotification() schedules
// into gift_notifications — until this existed, "email"/"push" channel rows
// just sat in the table forever with status='scheduled' and nothing ever
// dispatched them. Vercel Cron hits this on a schedule (see vercel.json);
// it can also be triggered manually with the same bearer token for testing.
import { fetchDueNotifications, fetchProfileByPhone, fetchProfilesByIds, fetchPushSubscriptions, markNotificationStatus, setSmsOptStatus } from "../../server/api-lib/notifications.mjs";
import { sendEmail } from "../../server/api-lib/email.mjs";
import { sendPushToSubscription } from "../../server/api-lib/push.mjs";
import { classifySmsKeyword, sendSms } from "../../server/api-lib/sms.mjs";

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

// Handles STOP/START/HELP replies to AutoGift texts. Point an SNS topic
// subscription (or an Amazon Pinpoint two-way SMS destination) at
// https://givit.site/api/cron/dispatch-notifications?webhook=sms-inbound&token=<SMS_INBOUND_SECRET>
// -- kept as a query-param branch on this existing function rather than a
// new api/ file because this project sits at Vercel's Hobby-plan 12-function
// cap (see the comment in api/stripe/setup-intent.ts). Accepts either a
// bare `{ from, body }` JSON payload or an SNS-style envelope where `Message`
// is itself a JSON string carrying `originationNumber`/`messageBody`
// (the shape Pinpoint/SNS two-way SMS delivers), so it isn't locked to one
// specific AWS product's exact wire format.
async function handleInboundSms(req: any, res: any) {
  // Fails closed, not open: this endpoint can flip any user's SMS consent
  // (STOP/START) given only their phone number, so an unset secret must
  // reject every request rather than skip the check entirely -- the
  // previous `if (expected && ...)` let anyone hit this unauthenticated
  // for as long as SMS_INBOUND_SECRET was never configured.
  const expected = process.env.SMS_INBOUND_SECRET;
  if (!expected || req.query?.token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let raw = req.body;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch { raw = {}; }
    }
    raw = raw ?? {};

    let from = raw.from ?? raw.originationNumber;
    let body = raw.body ?? raw.messageBody;
    if ((!from || !body) && typeof raw.Message === "string") {
      try {
        const inner = JSON.parse(raw.Message);
        from = from ?? inner.originationNumber;
        body = body ?? inner.messageBody;
      } catch { /* not JSON -- e.g. an SNS SubscriptionConfirmation, nothing to classify */ }
    }

    const keyword = classifySmsKeyword(body);
    if (!from || !keyword || keyword === "help") {
      res.status(200).json({ ok: true, action: "none" });
      return;
    }

    const profile = await fetchProfileByPhone(from);
    if (!profile) {
      res.status(200).json({ ok: true, action: "none", reason: "no matching profile" });
      return;
    }

    if (keyword === "stop") {
      await setSmsOptStatus(profile.id, { sms_opt_in: false, sms_opted_out_at: new Date().toISOString() });
    } else if (keyword === "start") {
      await setSmsOptStatus(profile.id, { sms_opt_in: true, sms_opted_out_at: null });
    }
    res.status(200).json({ ok: true, action: keyword });
  } catch (error: any) {
    console.error("dispatch-notifications: inbound SMS webhook failed", error?.message);
    res.status(200).json({ ok: false }); // 200 so the SMS gateway doesn't retry-storm on our bug
  }
}

export default async function handler(req: any, res: any) {
  if (req.query?.webhook === "sms-inbound") {
    return handleInboundSms(req, res);
  }

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
    // Consent, not just a phone number on file, gates every SMS send --
    // sms_opted_out_at is checked independently of sms_opt_in so a STOP
    // reply wins even if something elsewhere flips the opt-in flag back on.
    const smsAllowedByUserId = new Map(profiles.map((p: any) => [p.id, Boolean(p.sms_opt_in) && !p.sms_opted_out_at]));

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
          if (!phone || !smsAllowedByUserId.get(notification.user_id)) {
            // Not a delivery failure -- the recipient never opted in, or
            // opted back out via STOP. Skipped, not failed, so this doesn't
            // look like a retryable error on the dashboard.
            results.skipped++;
            await markNotificationStatus(notification.id, "sent");
            continue;
          }
          await sendSms(phone, `${notification.title} — ${notification.body} Reply STOP to opt out.`);
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
