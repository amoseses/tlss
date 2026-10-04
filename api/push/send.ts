/// <reference path="../mjs-modules.d.ts" />
import { sendPushToSubscription } from "../../server/api-lib/push.mjs";
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { restFetch } from "../../server/api-lib/supabase-rest.mjs";

// Test-push endpoint ("Send a test notification" in settings). It used to
// accept a raw subscription + title/body/url from anyone, which let any
// caller send Givit-signed pushes with arbitrary text and links. Now it
// only ever sends to the caller's own stored subscriptions, and only to
// an in-app path.
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

  const { title, body } = req.body ?? {};
  const payload = {
    title: typeof title === "string" && title.trim() ? title.trim().slice(0, 80) : "Givit",
    body: typeof body === "string" && body.trim() ? body.trim().slice(0, 200) : "You have a new update.",
    url: "/",
  };

  try {
    const subs = await restFetch(`push_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id,endpoint,p256dh,auth`);
    if (!Array.isArray(subs) || subs.length === 0) {
      res.status(404).json({ error: "No push subscription found. Enable notifications first." });
      return;
    }

    const results = await Promise.allSettled(
      subs.map((sub: any) => sendPushToSubscription({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)),
    );
    // 404/410 from the push service = that subscription is permanently
    // gone (permission revoked, browser data cleared) -- drop it so it
    // stops counting as "enabled".
    const gone = subs.filter((_: any, i: number) => {
      const r = results[i];
      return r.status === "rejected" && [404, 410].includes((r as PromiseRejectedResult).reason?.statusCode);
    });
    await Promise.all(gone.map((sub: any) => restFetch(`push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, { method: "DELETE" }).catch(() => null)));

    const sent = results.filter((r) => r.status === "fulfilled").length;
    if (sent === 0) {
      res.status(502).json({ error: "Push failed to send. Try re-enabling notifications." });
      return;
    }
    res.status(200).json({ ok: true, sent });
  } catch (error: any) {
    console.error("Push send failed:", error?.message);
    res.status(500).json({ error: "Push send failed" });
  }
}
