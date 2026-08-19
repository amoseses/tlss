import { useEffect, useState } from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to connect your Google Calendar.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export function GoogleCalendarConnect() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Check URL parameters when returning from Google OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const calendarParam = params.get("calendar");

    if (calendarParam === "connected") {
      toast.success("Google Calendar connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (calendarParam === "denied") {
      toast.error("Google Calendar permission was denied.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (calendarParam === "error") {
      toast.error("Failed to connect Google Calendar. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    authedFetch("/api/calendar/status")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const isConn = Boolean(data.connected);
          setStatus(isConn ? "connected" : "disconnected");
          if (calendarParam === "connected" && isConn) {
            // Auto sync events when returning from initial OAuth flow
            void syncNow();
          }
        }
      })
      .catch(() => { if (!cancelled) setStatus("disconnected"); });

    return () => { cancelled = true; };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const res = await authedFetch("/api/auth/google-calendar/callback", {
        method: "POST",
        body: JSON.stringify({ redirectPath: window.location.pathname }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* not JSON */ }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
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
    } catch (err: any) {
      toast.error(err.message || "Couldn't disconnect. Try again.");
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
          title="Click to sync latest events from Google Calendar"
        >
          {busy ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarCheck className="mr-1.5 h-4 w-4 text-emerald-300" />
          )}
          {busy ? "Syncing..." : "Calendar Synced"}
        </Button>
        <Button
          onClick={() => void disconnect()}
          disabled={busy}
          variant="outline"
          size="sm"
          className="h-8 rounded-xl text-xs cursor-pointer"
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
      className="h-8 rounded-xl border-border/60 text-xs font-semibold hover:border-givit-ember/40 hover:bg-muted/60 cursor-pointer"
    >
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-givit-ember ${busy ? "animate-spin" : ""}`} />
      {busy ? "Connecting..." : "Connect Google Calendar"}
    </Button>
  );
}
