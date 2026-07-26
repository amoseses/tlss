import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, X } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { nextOccurrenceDate } from "@/lib/date-utils";

const DISMISS_KEY = "givit-urgent-banner-dismissed";
const URGENT_WITHIN_DAYS = 3;

type Urgent = { name: string; label: string; daysUntil: number; date: string };

function dismissedKey(u: Urgent) {
  return `${u.name}-${u.label}-${u.date}`;
}

// The bell-icon dropdown on /concierge is easy to miss entirely, especially
// the day a message like "someone's birthday is in 2 days" actually matters.
// This surfaces the same underlying data (real occasions, real days-until —
// see date-utils' nextOccurrenceDate) as a banner you'd have to actively
// dismiss, only when something is genuinely close.
export function UrgentOccasionBanner() {
  const { user } = useAuth();
  const [urgent, setUrgent] = useState<Urgent | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setDismissed(new Set(JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? "[]")));
    } catch { /* ignore malformed local state */ }
  }, []);

  useEffect(() => {
    if (!user) { setUrgent(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      const today = new Date();
      const candidates: Urgent[] = [];
      for (const row of rows) {
        for (const occ of row.gift_occasions ?? []) {
          if (!occ.occasion_date) continue;
          const next = nextOccurrenceDate(occ.occasion_date, today);
          const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
          if (daysUntil >= 0 && daysUntil <= URGENT_WITHIN_DAYS) {
            candidates.push({ name: row.name, label: occ.occasion, daysUntil, date: occ.occasion_date });
          }
        }
      }
      candidates.sort((a, b) => a.daysUntil - b.daysUntil);
      setUrgent(candidates[0] ?? null);
    });
    return () => { mounted = false; };
  }, [user]);

  if (!urgent || dismissed.has(dismissedKey(urgent))) return null;

  function dismiss() {
    if (!urgent) return;
    const next = new Set(dismissed).add(dismissedKey(urgent));
    setDismissed(next);
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next)));
  }

  const when = urgent.daysUntil === 0 ? "today" : urgent.daysUntil === 1 ? "tomorrow" : `in ${urgent.daysUntil} days`;

  return (
    <div className="border-b border-givit-ember/20 bg-givit-ember/10">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2.5 text-sm">
          <Bell className="h-4 w-4 shrink-0 text-givit-ember" />
          <p className="text-givit-ink">
            <span className="font-semibold">{urgent.name}'s {urgent.label.toLowerCase()}</span> is {when} — want AutoGift to build a gift now?
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/concierge" className="rounded-full bg-givit-ember px-4 py-1.5 text-xs font-semibold text-white hover:bg-givit-ember-hover">
            Build it now
          </Link>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-md p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
