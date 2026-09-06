import { savePushSubscription, removePushSubscription, getMyPushSubscriptions } from "@/lib/supabase/db";

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// A browser-level subscription existing doesn't mean it's actually usable --
// if the earlier savePushSubscription() write failed (missing table, RLS,
// network blip), the browser still holds a live subscription with nothing
// on the server to send to. Cross-checking against the DB catches that
// desync instead of showing "on" for a subscription that can never
// actually deliver anything, and self-heals by dropping the orphaned
// browser subscription so a future "turn on" tries fresh instead of
// reusing the same dead one.
export async function isSubscribedToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;

  const saved = await getMyPushSubscriptions(userId);
  const persisted = saved.some((row) => row.endpoint === subscription.endpoint);
  if (!persisted) {
    await subscription.unsubscribe().catch(() => {});
    return false;
  }
  return true;
}

export async function subscribeToPush(userId: string): Promise<{ error?: string }> {
  if (!isPushSupported()) return { error: "Push notifications aren't supported in this browser." };

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) return { error: "Push isn't configured yet (missing VITE_VAPID_PUBLIC_KEY)." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "Notification permission was denied." };

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const { error } = await savePushSubscription(userId, subscription.toJSON());
  if (error) {
    // Don't leave a browser-level subscription with nothing on the server
    // to send to -- that's exactly the desync isSubscribedToPush() guards
    // against, so avoid creating it in the first place when we already
    // know this attempt failed.
    await subscription.unsubscribe().catch(() => {});
    return { error: error.message ?? "Could not save your subscription." };
  }
  return {};
}

export async function unsubscribeFromPush(): Promise<{ error?: string }> {
  if (!isPushSupported()) return {};
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return {};
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await removePushSubscription(endpoint);
  if (error) return { error: error.message };
  return {};
}

export async function sendTestPush(userId: string, title: string, body: string): Promise<{ error?: string }> {
  const subscriptions = await getMyPushSubscriptions(userId);
  if (subscriptions.length === 0) return { error: "No push subscription found. Enable notifications first." };

  const results = await Promise.all(
    subscriptions.map((sub) =>
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          title,
          body,
        }),
      }).then((res) => res.ok),
    ),
  );
  if (results.every((ok) => !ok)) return { error: "Push failed to send. Try re-enabling notifications." };
  return {};
}
