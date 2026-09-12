/// <reference path="../mjs-modules.d.ts" />
// Actually sends the AutoGift reminders that createNotification() schedules
// into gift_notifications — until this existed, "email"/"push" channel rows
// just sat in the table forever with status='scheduled' and nothing ever
// dispatched them. Vercel Cron hits this on a schedule (see vercel.json);
// it can also be triggered manually with the same bearer token for testing.
import { fetchDueNotifications, fetchProfileByPhone, fetchProfilesByIds, fetchPushSubscriptions, markNotificationStatus, setSmsOptStatus, fetchDigestEligibleProfiles, fetchOccasionsForUsers } from "../../server/api-lib/notifications.mjs";
import { sendEmail } from "../../server/api-lib/email.mjs";
import { sendPushToSubscription } from "../../server/api-lib/push.mjs";
import { classifySmsKeyword, sendSms } from "../../server/api-lib/sms.mjs";
import { signState, verifyState } from "../../server/api-lib/auth.mjs";
import { restFetch } from "../../server/api-lib/supabase-rest.mjs";

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

// Same logic as the client's nextOccurrenceDate() (src/lib/date-utils.ts),
// reimplemented here rather than shared: this function is plain .mjs with
// no build step (see mjs-modules.d.ts's comment on why), and the client
// module isn't reachable from it. Occasions store a real calendar date
// (birthdays keep the real birth year) but recur annually, so "next
// occurrence" means the same month/day, whichever of this year or next
// year hasn't already passed.
function nextOccurrenceIso(dateStr: string): string {
  const [, month, day] = dateStr.split("-").map(Number);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thisYear = new Date(Date.UTC(today.getUTCFullYear(), month! - 1, day));
  const next = thisYear >= today ? thisYear : new Date(Date.UTC(today.getUTCFullYear() + 1, month! - 1, day));
  return next.toISOString().slice(0, 10);
}

function digestEmailBody(fullName: string | null, upcoming: Array<{ recipient: string; label: string; date: string }>, unsubscribeUrl: string) {
  const firstName = fullName?.split(" ")[0] || "there";
  const rows = upcoming.length > 0
    ? upcoming.map((o) => {
        const d = new Date(`${o.date}T12:00:00Z`);
        const when = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        return `<li style="margin-bottom:6px"><strong>${o.recipient}</strong>'s ${o.label} — ${when}</li>`;
      }).join("")
    : null;
  const body = rows
    ? `<p style="font-size:14px;line-height:1.6;color:#444">Here's what's coming up:</p><ul style="font-size:14px;line-height:1.6;color:#444;padding-left:20px">${rows}</ul>`
    : `<p style="font-size:14px;line-height:1.6;color:#444">You don't have anyone saved yet — add the people you care about once, and GIVIT remembers their dates so you never start from zero.</p>`;
  const ctaHref = rows ? "https://givit.site/concierge" : "https://givit.site/people";
  const ctaLabel = rows ? "Open AutoGift" : "Add your first person";
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c2542a">Givit — your week ahead</p>
    <h1 style="font-size:20px;margin:8px 0">Hi ${firstName},</h1>
    ${body}
    <a href="${ctaHref}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#c2542a;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600">${ctaLabel}</a>
    <p style="margin-top:28px;font-size:11px;color:#999">You're getting this because it's on by default for GIVIT accounts. <a href="${unsubscribeUrl}" style="color:#999">Unsubscribe from this weekly email</a>.</p>
  </div>`;
  const text = (rows
    ? `Here's what's coming up:\n${upcoming.map((o) => `- ${o.recipient}'s ${o.label} — ${o.date}`).join("\n")}`
    : "You don't have anyone saved yet — add the people you care about once, and GIVIT remembers their dates.")
    + `\n\n${ctaLabel}: ${ctaHref}\n\nUnsubscribe: ${unsubscribeUrl}`;
  return { html, text };
}

// Best-effort, separate from the main due-notifications dispatch above: a
// failure here (or the whole digest being skipped some days) should never
// affect real AutoGift reminders, which is why this is called from its own
// try/catch and never throws back to the caller.
async function dispatchWeeklyDigest() {
  const profiles = await fetchDigestEligibleProfiles();
  if (profiles.length === 0) return { sent: 0 };

  const occasions = await fetchOccasionsForUsers(profiles.map((p: any) => p.id));
  const byUser = new Map<string, Array<{ recipient: string; label: string; date: string }>>();
  for (const o of occasions) {
    const next = nextOccurrenceIso(o.occasion_date);
    const list = byUser.get(o.user_id) ?? [];
    list.push({ recipient: o.gift_recipients?.name ?? "Someone", label: o.occasion, date: next });
    byUser.set(o.user_id, list);
  }

  let sent = 0;
  for (const profile of profiles) {
    try {
      const upcoming = (byUser.get(profile.id) ?? []).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
      const unsubscribeUrl = `https://givit.site/api/cron/dispatch-notifications?webhook=unsubscribe-digest&token=${encodeURIComponent(signState({ userId: profile.id }, 365 * 24 * 3600 * 1000))}`;
      const { html, text } = digestEmailBody(profile.full_name, upcoming, unsubscribeUrl);
      await sendEmail({ to: profile.email, subject: "Your week ahead on GIVIT", html, text });
      sent++;
    } catch (error: any) {
      console.error(`dispatch-notifications: weekly digest failed for ${profile.id}`, error?.message);
    }
  }
  return { sent };
}

// A signed, no-login-required unsubscribe link embedded in every digest
// email -- clicking it must work from a cold email client with no session,
// so it can't go through the normal authenticated updateProfile() path.
async function handleUnsubscribeDigest(req: any, res: any) {
  const payload = verifyState(typeof req.query?.token === "string" ? req.query.token : "");
  if (!payload?.userId) {
    res.status(400).send("This unsubscribe link is invalid or has expired.");
    return;
  }
  try {
    await restFetch(`profiles?id=eq.${payload.userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ email_digest_opt_in: false }),
    });
    res.status(200).send("You've been unsubscribed from the weekly GIVIT digest. You'll still get AutoGift reminders for your saved dates.");
  } catch (error: any) {
    console.error("dispatch-notifications: unsubscribe-digest failed", error?.message);
    res.status(500).send("Couldn't process that right now. Please try again shortly.");
  }
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
  if (req.query?.webhook === "unsubscribe-digest") {
    return handleUnsubscribeDigest(req, res);
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

  // Runs inside this same daily cron rather than its own cron entry --
  // Vercel's Hobby plan caps cron jobs at 2, and both are already spoken
  // for (this function's own daily schedule, plus dispatch-followups).
  // Gated to Monday so it's actually weekly despite the function itself
  // running every day; ?job=weekly-digest forces it on any day for testing.
  let digestResult: { sent: number } | null = null;
  if (new Date().getUTCDay() === 1 || req.query?.job === "weekly-digest") {
    digestResult = await dispatchWeeklyDigest().catch((error: any) => {
      console.error("dispatch-notifications: weekly digest batch failed", error?.message);
      return { sent: 0 };
    });
  }

  try {
    const due = await fetchDueNotifications();
    if (!Array.isArray(due) || due.length === 0) {
      res.status(200).json({ ok: true, ...results, digest: digestResult, message: "Nothing due." });
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

    res.status(200).json({ ok: true, ...results, total: due.length, digest: digestResult });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "dispatch-notifications failed" });
  }
}
