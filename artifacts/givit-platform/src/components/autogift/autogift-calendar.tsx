import { useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Occasion = { label: string; date: string };
type Recipient = { id: string; name: string; occasions: Occasion[] };
type DayOccasion = { recipient: string; label: string; date: string };

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function relativeLabel(daysUntil: number) {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil < 14) return `in ${daysUntil} days`;
  if (daysUntil < 60) return `in ${Math.round(daysUntil / 7)} weeks`;
  return `in ${Math.round(daysUntil / 30)} months`;
}

// Occasions recur yearly and are stored with whatever year they were first
// entered, so "days until" has to project forward to the next real
// occurrence (this year if it hasn't passed yet, otherwise next year) —
// not just diff against the stored date, which could be in the past.
function daysUntilNextOccurrence(month: number, day: number, from: Date) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month, day);
  if (next < today) next = new Date(from.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/**
 * Compact month-grid calendar for AutoGift — dates recur yearly, so a day
 * is marked whenever any occasion falls on that month/day, regardless of
 * which year is stored. Clicking a marked day shows what's scheduled: who,
 * how far away it actually is, and whether a reminder is already queued
 * for it (not just that "something" is on this day).
 */
export function AutoGiftCalendar({ recipients, scheduledKeys }: { recipients: Recipient[]; scheduledKeys?: Set<string> }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const occasionsByDay = useMemo(() => {
    const map = new Map<number, DayOccasion[]>();
    for (const r of recipients) {
      for (const o of r.occasions) {
        if (!o.date) continue;
        const d = new Date(`${o.date}T12:00:00`);
        if (Number.isNaN(d.getTime()) || d.getMonth() !== cursor.month) continue;
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), { recipient: r.name, label: o.label, date: o.date }]);
      }
    }
    return map;
  }, [recipients, cursor.month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.year && today.getMonth() === cursor.month;
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedOccasions = selectedDay ? occasionsByDay.get(selectedDay) : undefined;

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(null);
  }

  return (
    <div className="givit-section">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-givit-ember" />
          <h2 className="font-semibold text-givit-ink">{monthLabel}</h2>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_LABELS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayOccasions = day ? occasionsByDay.get(day) : undefined;
          const isToday = isCurrentMonth && day === today.getDate();
          const hasReminder = dayOccasions?.some((o) => scheduledKeys?.has(`${o.recipient}-${o.label}-${o.date}`));
          return (
            <button
              key={i}
              type="button"
              disabled={!day}
              onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
              title={dayOccasions?.map((o) => `${o.recipient}: ${o.label}`).join(", ")}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-xs transition ${
                !day
                  ? ""
                  : selectedDay === day
                    ? "ring-2 ring-givit-ember"
                    : ""
              } ${
                !day
                  ? ""
                  : isToday
                    ? "givit-gradient font-bold text-white shadow-sm"
                    : dayOccasions
                      ? "bg-givit-ember/10 font-semibold text-givit-ember hover:bg-givit-ember/20"
                      : "text-foreground hover:bg-muted"
              }`}
            >
              {day}
              {dayOccasions && !isToday && (
                hasReminder
                  ? <Bell className="absolute bottom-1 h-2.5 w-2.5 fill-givit-coral text-givit-coral" />
                  : <span className="absolute bottom-1 h-1 w-1 rounded-full bg-givit-coral" />
              )}
            </button>
          );
        })}
      </div>

      {selectedOccasions && selectedOccasions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          {selectedOccasions.map((o, i) => {
            const parsed = new Date(`${o.date}T12:00:00`);
            const daysUntil = daysUntilNextOccurrence(parsed.getMonth(), parsed.getDate(), today);
            const scheduled = scheduledKeys?.has(`${o.recipient}-${o.label}-${o.date}`);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{o.recipient} · {o.label}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    {scheduled ? <><Bell className="h-3 w-3 text-givit-ember" /> Reminder scheduled</> : "No reminder scheduled"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-givit-ember/10 px-2 py-1 font-semibold text-givit-ember">{relativeLabel(daysUntil)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
