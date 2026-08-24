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
import { syncCatalogBatch } from "../../server/api-lib/bulk-sync.mjs";
import { updateProductPrice } from "../../server/api-lib/price-update.mjs";
import fs from "fs";
import path from "path";

// Default catalog items the bulk price sync refreshes when the caller
// doesn't send its own `items` list.
const PRICE_SYNC_DEFAULT_ITEMS = [
  { slug: "sony-wh-1000xm5", affiliateUrl: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b" },
  { slug: "kindle-paperwhite", affiliateUrl: "https://www.amazon.com/dp/B08KTZ8249" },
  { slug: "pilot-custom-823", affiliateUrl: "https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber" },
  { slug: "anker-737-power-bank", affiliateUrl: "https://www.anker.com/products/a1289" },
  { slug: "apple-pencil-pro", affiliateUrl: "https://www.apple.com/apple-pencil/" },
  { slug: "apple-airtags-4-pack", affiliateUrl: "https://www.apple.com/airtag/" },
  { slug: "lego-botanicals-orchid", affiliateUrl: "https://www.lego.com/en-us/product/orchid-10311" },
  { slug: "ember-temperature-control-mug", affiliateUrl: "https://ember.com/products/ember-mug-2" },
  { slug: "theragun-mini", affiliateUrl: "https://www.therabody.com/us/en-us/theragun-mini.html" },
  { slug: "stanley-quencher-h2-0", affiliateUrl: "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz" },
  { slug: "aeropress-clear", affiliateUrl: "https://aeropress.com/products/aeropress-clear" },
  { slug: "patagonia-black-hole-duffel", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55l/49344.html" },
  { slug: "nintendo-switch-oled", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/" },
  { slug: "dyson-airwrap", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap" },
  { slug: "brooklinen-super-plush-robe", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robes" },
  { slug: "aura-frame", affiliateUrl: "https://auraframes.com/digital-frame/carver" },
  { slug: "lululemon-everywhere-belt-bag", affiliateUrl: "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag-1L/_/prod10050055" },
];

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

// Bulk-refreshes live prices for the catalog. Point a scheduler (or a
// manual call, same bearer/query-secret pattern as the main dispatch job
// below) at ?job=sync-prices -- kept as a branch on this existing function
// rather than its own api/ file for the same Vercel Hobby-plan 12-function
// cap reason as the SMS webhook above.
async function handleSyncPrices(req: any, res: any) {
  const secret = process.env.CRON_SECRET || process.env.PRICE_SYNC_SECRET;
  if (secret) {
    const auth = req.headers?.authorization;
    const querySecret = req.query?.secret;
    if (auth !== `Bearer ${secret}` && querySecret !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const itemsToSync = Array.isArray(req.body?.items) ? req.body.items : PRICE_SYNC_DEFAULT_ITEMS;
    const results = await syncCatalogBatch(itemsToSync, 3, 200);

    const updatedCount = results.filter((r: any) => r.status === "updated").length;
    const skippedCount = results.filter((r: any) => r.status === "skipped").length;
    const failedCount = results.filter((r: any) => r.status === "failed").length;

    res.status(200).json({
      ok: true,
      message: `Bulk catalog sync complete: ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed.`,
      stats: { total: results.length, updated: updatedCount, skipped: skippedCount, failed: failedCount },
      details: results,
    });
  } catch (error: any) {
    console.error("dispatch-notifications: bulk price sync failed", error?.message);
    res.status(500).json({ error: error?.message ?? "Bulk price sync failed" });
  }
}

function parsePriceToCents(val: any): number | null {
  if (typeof val === "number") {
    if (Number.isInteger(val) && val > 500) return val;
    return Math.round(val * 100);
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) || num <= 0 ? null : Math.round(num * 100);
  }
  return null;
}

// GET returns the cached live-prices snapshot (public, no auth). POST is
// the external price-update webhook (e.g. changedetection.io). Reachable
// at ?job=live-prices -- not its own api/live-prices.ts file, for the same
// Hobby-plan function-cap reason as sync-prices and sms-inbound above.
//
// NOTE: the GET side reads (and POST writes) a JSON file inside the
// deployed source tree. Vercel serverless functions run on a read-only
// filesystem outside /tmp, so in production the write in
// updateProductPrice's saveLocalPriceOverride() silently no-ops (it's
// wrapped in its own try/catch) -- this works in local dev only. Fixing
// that for real means moving the cache to Supabase or another persistent
// store; flagged here rather than silently patched over, since it changes
// the feature's actual architecture.
async function handleLivePrices(req: any, res: any) {
  if (req.method === "POST" || req.query?.action === "webhook") {
    if (req.method === "GET") {
      res.status(200).json({ ok: true, service: "GIVIT Price Sync Webhook", status: "active" });
      return;
    }

    const secret = process.env.PRICE_SYNC_SECRET || process.env.CRON_SECRET;
    if (secret) {
      const authHeader = req.headers?.authorization;
      const querySecret = req.query?.secret;
      const tokenValid = authHeader === `Bearer ${secret}` || querySecret === secret;
      if (!tokenValid) {
        res.status(401).json({ error: "Unauthorized: Invalid PRICE_SYNC_SECRET token." });
        return;
      }
    }

    const body = req.body ?? {};
    const url = body.url || body.url_watched || body.product_url || body.target_url || req.query?.url;
    const productId = body.product_id || body.productId || body.id;
    const slug = body.slug;
    const rawPrice = body.price || body.current_price || body.price_cents || body.snapshot || body.price_text;
    const rawSalePrice = body.sale_price || body.sale_price_cents;
    const priceCents = parsePriceToCents(rawPrice);
    const salePriceCents = parsePriceToCents(rawSalePrice);

    if (!priceCents) {
      res.status(400).json({ error: "Missing or unparseable price field. Send 'price' as string ($29.99) or number (2999).", receivedBody: body });
      return;
    }
    if (!url && !productId && !slug) {
      res.status(400).json({ error: "Missing product identifier. Send 'url', 'product_id', or 'slug'.", receivedBody: body });
      return;
    }

    try {
      const result = await updateProductPrice({
        url: typeof url === "string" ? url : undefined,
        productId: typeof productId === "string" ? productId : undefined,
        slug: typeof slug === "string" ? slug : undefined,
        priceCents,
        salePriceCents: salePriceCents ?? undefined,
        currency: typeof body.currency === "string" ? body.currency : "USD",
      });
      res.status(200).json({ ok: true, message: "Price updated successfully", ...result });
    } catch (error: any) {
      console.error("dispatch-notifications: price update webhook failed", error?.message);
      res.status(500).json({ error: error?.message ?? "Price sync failed" });
    }
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const filePath = path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/live-prices.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.status(200).send(content);
    } else {
      res.status(200).json({});
    }
  } catch {
    res.status(200).json({});
  }
}

export default async function handler(req: any, res: any) {
  if (req.query?.job === "live-prices") {
    return handleLivePrices(req, res);
  }
  if (req.query?.job === "sync-prices") {
    return handleSyncPrices(req, res);
  }
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
