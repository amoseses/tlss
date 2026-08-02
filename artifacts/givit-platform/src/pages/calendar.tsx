import { Link } from "wouter";
import { Bell, CalendarDays, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { useRecipients, nextOccurrenceDate } from "@/lib/hooks/use-recipients";
import { AutoGiftCalendar } from "@/components/autogift/autogift-calendar";

export default function CalendarPage() {
  const { user, profile, loading } = useAuth();
  const { recipients, notifications, localReady } = useRecipients(user, profile?.default_reminder_lead_days ?? undefined);

  const scheduledKeys = new Set(notifications.map((n) => `${n.recipientName}-${n.occasion}-${n.date}`));

  const upcomingAll = recipients
    .flatMap((r) =>
      r.occasions.filter((o) => o.date).map((o) => ({ ...o, recipient: r.name, parsed: nextOccurrenceDate(o.date) }))
    )
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(0, 8);

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
            <h2 className="font-serif text-3xl font-bold text-white">Every date, in one place.</h2>
            <p className="text-sm leading-6 text-white/70">Save birthdays and anniversaries in People and they show up here automatically, year-round.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full givit-gradient px-6 text-white hover:brightness-110"><Link href="/signup?next=/calendar">Create free account</Link></Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 px-6 text-white hover:bg-white/20"><Link href="/login?next=/calendar">Log in</Link></Button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Calendar</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gifting calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every date saved in <Link href="/people" className="text-givit-ember hover:underline">People</Link>, tracked here year-round.</p>
        </div>
        <Button asChild variant="outline" className="rounded-md">
          <Link href="/people"><UserRound className="h-4 w-4" /> Manage people</Link>
        </Button>
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10 text-3xl">
            <CalendarDays className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">Nothing on the calendar yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Add people and their key dates in People and they'll show up here.</p>
          <Button asChild className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/people"><UserRound className="h-4 w-4" /> Go to People</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-4">
            <AutoGiftCalendar recipients={recipients} scheduledKeys={scheduledKeys} />
          </div>
          <aside className="space-y-3">
            <div className="givit-section">
              <h2 className="mb-3 font-semibold text-givit-ink">Upcoming</h2>
              {upcomingAll.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dates saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAll.map((o, i) => {
                    const daysUntil = Math.ceil((o.parsed.getTime() - Date.now()) / 86400000);
                    const urgency = daysUntil <= 14 ? "bg-rose-50 text-rose-700" : daysUntil <= 42 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
                    const scheduled = scheduledKeys.has(`${o.recipient}-${o.label}-${o.date}`);
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full givit-gradient text-xs font-bold text-white">
                          {o.recipient[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{o.recipient} · {o.label}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            {scheduled ? (<><Bell className="h-3 w-3 text-givit-ember" /> Reminder scheduled</>) : "No reminder scheduled yet"}
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
      )}
    </PageShell>
  );
}
