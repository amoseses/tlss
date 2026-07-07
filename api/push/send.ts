/// <reference path="../mjs-modules.d.ts" />
import { sendPushToSubscription } from "../_lib/push.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { subscription, title, body, url } = req.body ?? {};
  if (!subscription?.endpoint || !subscription?.keys) {
    res.status(400).json({ error: "subscription is required" });
    return;
  }
  try {
    await sendPushToSubscription(subscription, {
      title: title || "Givit",
      body: body || "You have a new update.",
      url: url || "/",
    });
    res.status(200).json({ ok: true });
  } catch (error: any) {
    // A 410 from the push service means the subscription is gone (user
    // uninstalled, revoked permission, etc.) — not a real server error.
    const statusCode = error?.statusCode === 410 ? 410 : 500;
    res.status(statusCode).json({ error: error?.message ?? "Push send failed" });
  }
}
