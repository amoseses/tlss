import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Goes through the Supabase client's own session getter rather than
// hand-reconstructing its localStorage key (`sb-<project-ref>-auth-token`)
// and reading it directly -- that reconstruction is one Supabase client
// version bump away from silently returning null (this component briefly
// duplicated exactly that fragile version alongside a second, more direct
// one on the People page; consolidated onto the more direct approach here).
async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
}

export function GoogleCalendarConnect({ variant = "compact" }: { variant?: "compact" | "card" }) {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/calendar/status")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setStatus(data.connected ? "connected" : "disconnected"); })
      .catch(() => { if (!cancelled) setStatus("disconnected"); });
    return () => { cancelled = true; };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      // Tells the OAuth callback which page to send the browser back to --
      // without this it always landed on /people even when the button was
      // clicked from /calendar (see the comment in that route).
      const returnTo = encodeURIComponent(window.location.pathname);
      const res = await authedFetch(`/api/auth/google-calendar/callback?returnTo=${returnTo}`, { method: "POST" });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* not JSON */ }
      if (data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || (raw ? raw.slice(0, 200) : `Request failed (${res.status}).`));
    } catch (err: any) {
      toast.error(err.message || "Couldn't connect Google Calendar.");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await authedFetch("/api/auth/google-calendar/callback", { method: "DELETE" });
      setStatus("disconnected");
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Couldn't disconnect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      const res = await authedFetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed.");
      toast.success(`Synced: ${data.peopleCreated} new ${data.peopleCreated === 1 ? "person" : "people"}, ${data.occasionsAdded} date${data.occasionsAdded === 1 ? "" : "s"} added.`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast.error(err.message || "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const buttons = status === "connected" ? (
    <div className="flex items-center gap-1.5">
      <Button
        onClick={() => void syncNow()}
        disabled={busy}
        size="sm"
        className="h-8 rounded-xl bg-givit-ember px-3 text-xs font-semibold text-white hover:bg-givit-ember-hover shadow-xs cursor-pointer"
      >
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Syncing..." : "Sync now"}
      </Button>
      <Button onClick={() => void disconnect()} disabled={busy} variant="outline" size="sm" className="h-8 rounded-xl text-xs">
        Disconnect
      </Button>
    </div>
  ) : (
    <Button
      onClick={() => void connect()}
      disabled={busy}
      size="sm"
      variant="outline"
      className="h-8 rounded-xl border-border/60 text-xs font-semibold hover:border-givit-ember/40 hover:bg-muted/60"
    >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-givit-ember" />
      Connect Google Calendar
    </Button>
  );

  if (variant === "compact") return buttons;

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <p className="text-sm font-semibold text-givit-ink">Google Calendar</p>
        <p className="text-xs text-muted-foreground">{status === "connected" ? "Connected — stays in sync until you disconnect." : "Connect once, sync any time."}</p>
      </div>
      {buttons}
    </div>
  );
}
