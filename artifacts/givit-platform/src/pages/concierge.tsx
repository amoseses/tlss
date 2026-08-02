import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Calendar, CalendarDays, Gift, Sparkles, UserRound, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/ui/reveal";
import { useAuth } from "@/lib/auth/use-auth";
import { useRecipients, nextOccurrenceDate, type ConciergeNotification } from "@/lib/hooks/use-recipients";
import { initials } from "@/lib/utils";
import { AutoGiftOnboardingWizard } from "@/components/autogift/autogift-onboarding-wizard";
import { GiftSurveyModal } from "@/components/autogift/autogift-survey-modal";
import { AutoGiftCalendar } from "@/components/autogift/autogift-calendar";

export default function ConciergePage() {
  const { user, profile, loading } = useAuth();
  const { recipients, notifications, activeNotifications, localReady, dismissNotification } = useRecipients(user, profile?.default_reminder_lead_days ?? undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPersonId, setCalendarPersonId] = useState<string | null>(null);
  // useAuth() re-validates the session (and flips loading back to true)
  // whenever the tab regains focus — without this, the full-page spinner
  // below would unmount the whole page, including an in-progress
  // AutoGiftOnboardingWizard, wiping its step/address/card/recipient state
  // back to the first slide every time someone switched tabs and came back.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    if (!loading) setHasLoadedOnce(true);
  }, [loading]);
  const [surveyNotification, setSurveyNotification] = useState<ConciergeNotification | null>(null);
  const onboardingComplete = Boolean((profile as any)?.concierge_onboarding_completed) || window.localStorage.getItem("givit-autogift-onboarded") === "1";

  // Require onboarding before anyone can enter AutoGift automation.
  useEffect(() => {
    if (!localReady || loading) return;
    if (!user) {
      if (!window.localStorage.getItem("givit-autogift-onboarded")) setShowOnboarding(true);
      return;
    }
    if (!onboardingComplete) setShowOnboarding(true);
  }, [loading, user, localReady, onboardingComplete]);

  // nextOccurrenceDate, not new Date(o.date) directly -- birthdays are
  // stored with the recipient's real birth year, so a raw date comparison
  // reads every birthday as decades in the past and it never shows up here.
  const upcomingAll = recipients
    .flatMap((r) =>
      r.occasions.filter((o) => o.date).map((o) => ({ ...o, recipient: r.name, parsed: nextOccurrenceDate(o.date) }))
    )
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(0, 8);

  // A reminder is already scheduled the moment the occasion is saved (see
  // useRecipients' generateNotifications), so "reminder set" is real status,
  // not decoration — this just surfaces it per item instead of only in the
  // separate notifications dropdown. Deliberately built from the FULL
  // notification list, not activeNotifications (unread-only) -- dismissing
  // the bell notification is just clearing a badge, it must not also flip
  // this "is a reminder scheduled" indicator back to "no" for an occasion
  // that's still genuinely scheduled.
  const scheduledKeys = new Set(notifications.map((n) => `${n.recipientName}-${n.occasion}-${n.date}`));

  const onAutoGift = recipients.filter((r) => r.automationEnabled !== false);
  const calendarPerson = calendarPersonId ? recipients.find((r) => r.id === calendarPersonId) : null;

  if (loading && !hasLoadedOnce) {
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
        {showOnboarding && (
          <AutoGiftOnboardingWizard
            required={false}
            onClose={() => setShowOnboarding(false)}
          />
        )}
        <div className="relative overflow-hidden rounded-2xl bg-black px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-givit-ember/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-givit-coral/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl givit-gradient givit-glow">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-white">Gifting on autopilot.</h2>
            <p className="text-sm leading-6 text-white/70">Save your people once in People. AutoGift reminds you 5–6 weeks out, builds a personalized bundle, and only charges once you approve it.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full givit-gradient px-6 text-white hover:brightness-110"><Link href="/signup?next=/concierge">Create free account</Link></Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 px-6 text-white hover:bg-white/20"><Link href="/login?next=/concierge">Log in</Link></Button>
            </div>
            <button onClick={() => setShowOnboarding(true)} className="mt-1 text-xs font-semibold text-white/50 underline-offset-4 hover:text-white/80 hover:underline">
              Just want a quick look first? Take the 60-second tour →
            </button>
            <a href="https://calendly.com/atticusmoes/new-meeting?month=2026-07" target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline">
              Prefer to talk it through? Contact us
            </a>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {showOnboarding && (
        <AutoGiftOnboardingWizard
          required={Boolean(user) || !window.localStorage.getItem("givit-autogift-onboarded")}
          onClose={() => {
            setShowOnboarding(false);
          }}
        />
      )}
      {surveyNotification && !showOnboarding && (
        <GiftSurveyModal
          recipientName={surveyNotification.recipientName}
          occasion={surveyNotification.occasion}
          occasionDate={surveyNotification.date}
          onClose={() => setSurveyNotification(null)}
        />
      )}

      {calendarPerson && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={() => setCalendarPersonId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full givit-gradient text-sm font-bold text-white">
                  {initials(calendarPerson.name)}
                </div>
                <p className="font-serif text-lg font-bold text-givit-ink">{calendarPerson.name}'s dates</p>
              </div>
              <button type="button" onClick={() => setCalendarPersonId(null)} aria-label="Close calendar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <AutoGiftCalendar recipients={[calendarPerson]} scheduledKeys={scheduledKeys} />
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gifting agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every date tracked in <Link href="/people" className="text-givit-ember hover:underline">People</Link>: the agent watches the calendar and reasons through what to give, you approve before anything ships.</p>
        </div>
        <div className="flex gap-2">
          {activeNotifications.length > 0 && (
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                className="rounded-md relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-givit-ember text-[9px] font-bold text-white">
                  {activeNotifications.length}
                </span>
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl">
                  <div className="border-b border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-givit-ember">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {activeNotifications.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">No new notifications</p>
                    ) : (
                      activeNotifications.map((n) => (
                        <div key={n.id} className="flex items-start gap-2 rounded-lg p-2.5 text-xs hover:bg-muted/50">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember">
                            <Bell className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{n.recipientName}'s {n.occasion}</p>
                            <p className="text-muted-foreground">{n.daysUntil} days away</p>
                          </div>
                          <button
                            onClick={() => setSurveyNotification(n)}
                            className="shrink-0 rounded bg-givit-ember px-2 py-1 font-semibold text-white hover:bg-givit-ember-hover"
                          >
                            Survey
                          </button>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Dismiss AutoGift reminder"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div id="reminders" className="scroll-mt-40 space-y-4">
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10 text-3xl">
                <UserRound className="h-6 w-6 text-givit-ember" />
              </div>
              <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No one to remind you about yet</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">Add people and their dates in People. Reminders, calendar, and automation all live here once they're saved.</p>
              <Button asChild className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                <Link href="/people"><UserRound className="h-4 w-4" /> Go to People</Link>
              </Button>
              <Button onClick={() => setShowOnboarding(true)} variant="outline" className="mt-3 rounded-lg">
                Retake onboarding tour
              </Button>
            </div>
          ) : (
            <>
              <div className="givit-section">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-givit-ember" />
                  <h2 className="font-semibold text-givit-ink">People on AutoGift</h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{onAutoGift.length} active</span>
                </div>
                {onAutoGift.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No one has AutoGift turned on yet. Enable it for a person on the <Link href="/people" className="text-givit-ember hover:underline">People</Link> page.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {onAutoGift.map((r) => {
                      const upcoming = r.occasions
                        .filter((o) => o.date)
                        .map((o) => ({ ...o, parsed: nextOccurrenceDate(o.date) }))
                        .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:border-givit-ember/40 hover:shadow-sm"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full givit-gradient text-sm font-bold text-white">
                            {initials(r.name)}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSurveyNotification({
                                id: `build-${r.id}`,
                                recipientName: r.name,
                                occasion: upcoming?.label || "upcoming gift",
                                date: upcoming?.date || new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10),
                                daysUntil: upcoming ? Math.ceil((upcoming.parsed.getTime() - Date.now()) / 86400000) : 35,
                                dismissed: false,
                                createdAt: new Date().toISOString(),
                              })
                            }
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                            <p className="truncate text-xs font-medium text-givit-ember">
                              {upcoming ? `Build for ${upcoming.label}, ${upcoming.parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })} →` : "Build their gift →"}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarPersonId(r.id)}
                            title={`${r.name}'s reminder dates`}
                            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-givit-sand hover:text-foreground"
                          >
                            <CalendarDays className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {upcomingAll.length > 0 && (
                <div className="givit-section">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-givit-ember" />
                      <h2 className="font-semibold text-givit-ink">Upcoming</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCalendar((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
                    >
                      <CalendarDays className="h-3.5 w-3.5" /> {showCalendar ? "Hide calendar" : "View calendar"}
                    </button>
                  </div>
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
                              {scheduled ? (
                                <><Bell className="h-3 w-3 text-givit-ember" /> Reminder scheduled</>
                              ) : (
                                "No reminder scheduled yet"
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
                </div>
              )}

              {showCalendar && <AutoGiftCalendar recipients={recipients} scheduledKeys={scheduledKeys} />}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Reveal variant="triangle" delayMs={100}>
          <div className="rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/15 to-givit-coral/10 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-givit-ink">How the agent works</h2>
                <ol className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                  <li>1. Add people and their key dates in People</li>
                  <li>2. 35 days before, the agent emails the survey at 10:00 AM EST</li>
                  <li>3. It reasons through the profile and proposes gifts, cards (+$5), flowers (+$25), and activities, with a reason for each</li>
                  <li>4. You approve, it charges the saved card, then admin fulfills and ships (fully autonomous purchasing is next)</li>
                </ol>
                <div className="mt-3 rounded-lg bg-black/20 p-2.5 text-xs">
                  <p className="font-semibold text-givit-ink">Pricing</p>
                  <p className="mt-1 text-muted-foreground">Calculated only after AI builds a tailored bundle. You approve before any charge.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="rounded-md text-xs h-9 w-full">
                <Link href="/people"><UserRound className="h-3.5 w-3.5" /> Manage people</Link>
              </Button>
              <Button asChild className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover text-xs h-9 w-full">
                <Link href="/gift"><Gift className="h-3.5 w-3.5" /> Find a gift now!</Link>
              </Button>
            </div>
          </div>
          </Reveal>
        </aside>
      </div>
    </PageShell>
  );
}
