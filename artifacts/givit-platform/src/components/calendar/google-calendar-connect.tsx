import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSupabasePublishableEnv } from "@/lib/supabase/env";

async function authedFetch(path: string, init?: RequestInit) {
  const { url, anonKey } = getSupabasePublishableEnv();
  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const raw = window.localStorage.getItem(storageKey);
  const token = raw ? JSON.parse(raw)?.access_token : null;
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, apikey: anonKey },
  });
}

export function GoogleCalendarConnect() {
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
      const res = await authedFetch("/api/auth/google-calendar/callback", { method: "POST" });
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

  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => void syncNow()}
          disabled={busy}
          size="sm"
          className="h-8 rounded-xl bg-givit-ember px-3 text-xs font-semibold text-white hover:bg-givit-ember-hover shadow-xs cursor-pointer"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Syncing..." : "Sync Google Calendar"}
        </Button>
        <Button
          onClick={() => void disconnect()}
          disabled={busy}
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
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
}
