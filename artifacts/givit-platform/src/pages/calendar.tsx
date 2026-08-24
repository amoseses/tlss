import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Bell, CalendarDays, Check, ChevronDown, Globe, UserRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { useRecipients, nextOccurrenceDate } from "@/lib/hooks/use-recipients";
import { AutoGiftCalendar } from "@/components/autogift/autogift-calendar";
import { GoogleCalendarConnect } from "@/components/calendar/google-calendar-connect";
import { detectUserRegion, getHolidaysForRegion, SUPPORTED_REGIONS } from "@/lib/data/holidays";

export default function CalendarPage() {
  const { user, profile, loading } = useAuth();
  const { recipients, notifications, localReady } = useRecipients(user, profile?.default_reminder_lead_days ?? undefined);
  const [region, setRegion] = useState(() => detectUserRegion());
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // Landing back here is how the Google OAuth redirect
  // (api/auth/google-calendar/callback) reports success/failure when the
  // connect flow was started from this page -- there's no other channel
  // back to the SPA from a full-page redirect Google itself controls.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar");
    if (!result) return;
    if (result === "connected") toast.success("Google Calendar connected. Hit \"Sync now\" to pull in birthdays.");
    else if (result === "denied") toast("Google Calendar wasn't connected.");
    else if (result === "error") toast.error("Couldn't connect Google Calendar. Try again.");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const currentYear = new Date().getFullYear();
  const holidays = useMemo(() => getHolidaysForRegion(region, currentYear), [region, currentYear]);

  const scheduledKeys = new Set(notifications.map((n) => `${n.recipientName}-${n.occasion}-${n.date}`));

  const upcomingPersonal = recipients
    .flatMap((r) =>
      r.occasions.filter((o) => o.date).map((o) => ({
        recipient: r.name,
        label: o.label,
        date: o.date,
        parsed: nextOccurrenceDate(o.date),
        isHoliday: false,
      }))
    );

  const upcomingHolidays = holidays.map((h) => ({
    recipient: h.name,
    label: `${h.category.toUpperCase()} HOLIDAY`,
    date: h.date,
    parsed: nextOccurrenceDate(h.date),
    isHoliday: true,
  }));

  const upcomingAll = [...upcomingPersonal, ...upcomingHolidays]
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(0, 10);

  if (loading && !localReady) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="relative overflow-hidden rounded-2xl bg-black px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-givit-ember/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-givit-coral/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl givit-gradient givit-glow">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-white">Every date & holiday, in one place.</h2>
            <p className="text-sm leading-6 text-white/70">Save birthdays and anniversaries in People and track regional public holidays automatically, year-round.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full givit-gradient px-6 text-white hover:brightness-110"><Link href="/signup?next=/calendar">Create free account</Link></Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 px-6 text-white hover:bg-white/20"><Link href="/login?next=/calendar">Log in</Link></Button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const selectedRegion = SUPPORTED_REGIONS.find((r) => r.code === region) ?? SUPPORTED_REGIONS[0];

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Calendar</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gifting calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every date saved in <Link href="/people" className="text-givit-ember hover:underline">People</Link> plus regional public holidays.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Google Calendar Connect / Sync Button */}
          <GoogleCalendarConnect />
          {/* Custom Styled Region Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRegionPicker(!showRegionPicker)}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:border-cyan-500/40 hover:bg-muted/60 transition-all cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-muted-foreground font-medium">Region:</span>
              <span>{selectedRegion.flag} {selectedRegion.name} ({selectedRegion.gmt})</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showRegionPicker ? "rotate-180 text-cyan-500" : ""}`} />
            </button>

            {showRegionPicker && (
              <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1 text-xs">
                  {SUPPORTED_REGIONS.map((r) => {
                    const isSelected = r.code === region;
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => {
                          setRegion(r.code);
                          setShowRegionPicker(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{r.flag}</span>
                          <span>{r.name}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-normal opacity-70">{r.gmt}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-cyan-500" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button asChild variant="outline" className="rounded-md">
            <Link href="/people"><UserRound className="h-4 w-4" /> Manage people</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <AutoGiftCalendar recipients={recipients} scheduledKeys={scheduledKeys} region={region} />
        </div>

        <aside className="space-y-4">
          <div className="givit-section">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-givit-ink">Upcoming Dates</h2>
              <span className="text-xs font-semibold text-muted-foreground">{selectedRegion.flag} {selectedRegion.name}</span>
            </div>

            {upcomingAll.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming dates found.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAll.map((o, i) => {
                  const daysUntil = Math.ceil((o.parsed.getTime() - Date.now()) / 86400000);
                  const urgency = o.isHoliday
                    ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
                    : daysUntil <= 14
                    ? "bg-rose-50 text-rose-700"
                    : daysUntil <= 42
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700";

                  const scheduled = !o.isHoliday && scheduledKeys.has(`${o.recipient}-${o.label}-${o.date}`);

                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${o.isHoliday ? "bg-cyan-500" : "givit-gradient"}`}>
                        {o.isHoliday ? <Sparkles className="h-4 w-4 text-white" /> : o.recipient[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{o.recipient}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {o.isHoliday ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Public Holiday</span>
                          ) : scheduled ? (
                            <><Bell className="h-3 w-3 text-givit-ember" /> Reminder scheduled</>
                          ) : (
                            "No reminder scheduled"
                          )}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${urgency}`}>
                        {o.parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysUntil}d
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button asChild className="w-full rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/concierge"><Bell className="h-4 w-4" /> Open AutoGift</Link>
          </Button>
        </aside>
      </div>
    </PageShell>
  );
}
