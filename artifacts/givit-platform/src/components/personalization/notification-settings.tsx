import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { isPushSupported, isSubscribedToPush, subscribeToPush, unsubscribeFromPush, sendTestPush } from "@/lib/push/subscribe";
import { updateProfile } from "@/lib/supabase/db";

const LEAD_TIME_OPTIONS = [7, 14, 21, 35, 56];

export function NotificationSettingsCard({ userId, defaultLeadDays }: { userId: string; defaultLeadDays: number }) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [leadDays, setLeadDays] = useState(defaultLeadDays);
  const [savingLeadDays, setSavingLeadDays] = useState(false);

  async function saveLeadDays(days: number) {
    setLeadDays(days);
    setSavingLeadDays(true);
    const { error } = await updateProfile(userId, { default_reminder_lead_days: days });
    setSavingLeadDays(false);
    if (error) setMessage("Couldn't save that. Try again.");
  }

  useEffect(() => {
    setSupported(isPushSupported());
    isSubscribedToPush().then(setSubscribed);
  }, []);

  async function toggle() {
    setBusy(true);
    setMessage("");
    if (subscribed) {
      const { error } = await unsubscribeFromPush();
      if (error) setMessage(error);
      else { setSubscribed(false); setMessage("Push notifications turned off."); }
    } else {
      const { error } = await subscribeToPush(userId);
      if (error) setMessage(error);
      else { setSubscribed(true); setMessage("Push notifications are on for this device."); }
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMessage("");
    const { error } = await sendTestPush(userId, "GIVIT", "This is what a real reminder will look like on this device.");
    setMessage(error || "Test notification sent, check your device.");
    setBusy(false);
  }

  return (
    <div className="givit-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-givit-ember" />
        <h2 className="font-semibold text-givit-ink">Notifications</h2>
      </div>

      <div className="mb-4 space-y-1.5">
        <label className="text-sm text-muted-foreground">Default reminder timing</label>
        <div className="flex items-center gap-2">
          <select
            value={leadDays}
            onChange={(e) => void saveLeadDays(Number(e.target.value))}
            disabled={savingLeadDays}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
          >
            {LEAD_TIME_OPTIONS.map((days) => (
              <option key={days} value={days}>{days % 7 === 0 ? `${days / 7} week${days === 7 ? "" : "s"}` : `${days} days`} before</option>
            ))}
          </select>
          {leadDays < 14 && <span className="text-xs text-muted-foreground">— may limit delivery options</span>}
        </div>
        <p className="text-xs text-muted-foreground">Applies to new occasions. Any occasion can still be set individually on its Person page.</p>
      </div>

      {!supported ? (
        <p className="text-sm text-muted-foreground">This browser doesn't support push notifications. Email reminders still work.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Get AutoGift reminders and order updates as real notifications on this device, not just email.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${subscribed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : subscribed ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              {subscribed ? "Notifications on" : "Turn on notifications"}
            </button>
            {subscribed && (
              <button type="button" onClick={test} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50">
                Send test
              </button>
            )}
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}
