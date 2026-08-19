import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Gift, Globe, Sparkles } from "lucide-react";
import type { PublicHoliday } from "@/lib/data/holidays";

type Occasion = { label: string; date: string };
type Recipient = { id: string; name: string; occasions: Occasion[] };
type DayOccasion = { recipient: string; label: string; date: string; isHoliday?: boolean; category?: string };

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function relativeLabel(daysUntil: number) {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil < 14) return `in ${daysUntil} days`;
  if (daysUntil < 60) return `in ${Math.round(daysUntil / 7)} weeks`;
  return `in ${Math.round(daysUntil / 30)} months`;
}

function daysUntilNextOccurrence(month: number, day: number, from: Date) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month, day);
  if (next < today) next = new Date(from.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function AutoGiftCalendar({
  recipients,
  scheduledKeys,
  holidays = [],
}: {
  recipients: Recipient[];
  scheduledKeys?: Set<string>;
  holidays?: PublicHoliday[];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "personal" | "holidays">("all");

  // Month & Year picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(cursor.year);

  const occasionsByDay = useMemo(() => {
    const map = new Map<number, DayOccasion[]>();

    // Personal recipient occasions
    if (filter === "all" || filter === "personal") {
      for (const r of recipients) {
        for (const o of r.occasions) {
          if (!o.date) continue;
          const d = new Date(`${o.date}T12:00:00`);
          if (Number.isNaN(d.getTime()) || d.getMonth() !== cursor.month) continue;
          const day = d.getDate();
          map.set(day, [...(map.get(day) ?? []), { recipient: r.name, label: o.label, date: o.date }]);
        }
      }
    }

    // Public regional holidays
    if (filter === "all" || filter === "holidays") {
      for (const h of holidays) {
        if (!h.date) continue;
        const d = new Date(`${h.date}T12:00:00`);
        if (Number.isNaN(d.getTime()) || d.getMonth() !== cursor.month) continue;
        const day = d.getDate();
        map.set(day, [
          ...(map.get(day) ?? []),
          { recipient: h.name, label: `${h.category.toUpperCase()} HOLIDAY`, date: h.date, isHoliday: true, category: h.category },
        ]);
      }
    }

    return map;
  }, [recipients, holidays, cursor.month, filter]);

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
    <div className="givit-section relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* Month & Year Title Unified Box Container Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setPickerYear(cursor.year);
              setShowDatePicker(!showDatePicker);
            }}
            className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 font-serif text-base font-bold transition-all cursor-pointer shadow-xs ${
              showDatePicker
                ? "border-givit-ember/60 bg-givit-ember/10 text-givit-ink ring-2 ring-givit-ember/30"
                : "border-border/60 bg-card text-givit-ink hover:border-givit-ember/40 hover:bg-muted/60"
            }`}
            title="Click to select month and year"
          >
            <CalendarDays className="h-4 w-4 text-givit-ember shrink-0" />
            <span>{monthLabel}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDatePicker ? "rotate-180 text-givit-ember" : "group-hover:text-givit-ember"}`} />
          </button>

          {/* Month & Year Picker Popover */}
          {showDatePicker && (
            <div className="absolute top-12 left-0 z-50 w-72 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              {/* Year Navigation Header */}
              <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-serif text-base font-bold text-givit-ink">{pickerYear}</span>
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((monthName, mIdx) => {
                  const isSelected = cursor.year === pickerYear && cursor.month === mIdx;
                  const isCurrentMonthThisYear = today.getFullYear() === pickerYear && today.getMonth() === mIdx;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => {
                        setCursor({ year: pickerYear, month: mIdx });
                        setSelectedDay(null);
                        setShowDatePicker(false);
                      }}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? "givit-gradient text-white shadow-xs"
                          : isCurrentMonthThisYear
                            ? "border border-givit-ember/50 bg-givit-ember/10 text-givit-ember font-bold"
                            : "bg-muted/40 text-foreground hover:bg-givit-ember/10 hover:text-givit-ember"
                      }`}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter Pill */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 transition ${filter === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("personal")}
            className={`rounded-md px-2.5 py-1 transition ${filter === "personal" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => setFilter("holidays")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${filter === "holidays" ? "bg-background text-cyan-600 dark:text-cyan-400 shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Sparkles className="h-3 w-3 text-cyan-500" /> Holidays
          </button>
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
          const hasPersonal = dayOccasions?.some((o) => !o.isHoliday);
          const holidayItem = dayOccasions?.find((o) => o.isHoliday);
          const hasHoliday = Boolean(holidayItem);
          const hasReminder = dayOccasions?.some((o) => !o.isHoliday && scheduledKeys?.has(`${o.recipient}-${o.label}-${o.date}`));
          const isHovered = hoveredDay === day;

          // Determine list of people for the hover popover:
          // Personal recipients on this date, or if it's a general holiday, fallback to recipients list
          const personalPeople = dayOccasions?.filter((o) => !o.isHoliday) ?? [];
          const peopleForPopover = personalPeople.length > 0
            ? personalPeople.map((o) => ({ name: o.recipient, label: o.label }))
            : recipients.slice(0, 4).map((r) => ({ name: r.name, label: holidayItem?.recipient || "Holiday" }));

          return (
            <div
              key={i}
              className="relative"
              onMouseEnter={() => day && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <button
                type="button"
                disabled={!day}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`relative flex aspect-square w-full items-center justify-center rounded-xl text-xs font-medium transition-all duration-200 ${
                  !day
                    ? ""
                    : isHovered
                      ? "scale-110 -translate-y-0.5 z-20 shadow-md ring-2 ring-cyan-500/50"
                      : selectedDay === day
                        ? "ring-2 ring-givit-ember"
                        : ""
                } ${
                  !day
                    ? ""
                    : isToday
                      ? "givit-gradient font-bold text-white shadow-sm"
                      : hasPersonal
                        ? "bg-givit-ember/10 font-semibold text-givit-ember hover:bg-givit-ember/20"
                        : hasHoliday
                          ? "bg-cyan-500/10 font-semibold text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300"
                          : "text-foreground hover:bg-muted"
                }`}
              >
                {day}
                {dayOccasions && !isToday && (
                  <div className="absolute bottom-1 flex items-center justify-center gap-0.5">
                    {hasReminder ? (
                      <Bell className="h-2.5 w-2.5 fill-givit-coral text-givit-coral" />
                    ) : hasPersonal ? (
                      <span className="h-1 w-1 rounded-full bg-givit-coral" />
                    ) : null}
                    {hasHoliday && <span className="h-1 w-1 rounded-full bg-cyan-500" />}
                  </div>
                )}
              </button>

              {/* Hover Popover Window */}
              {day && isHovered && (dayOccasions?.length || recipients.length > 0) && (
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-2xl border border-cyan-500/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md z-50 text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150 ${
                    i % 7 === 0 ? "left-0 translate-x-0" : i % 7 === 6 ? "left-auto right-0 translate-x-0" : ""
                  }`}
                >
                  {/* Popover Header */}
                  <div className="mb-2 border-b border-border/40 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {new Date(cursor.year, cursor.month, day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {hasHoliday && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                          <Sparkles className="h-2.5 w-2.5" /> Holiday
                        </span>
                      )}
                    </div>
                    {holidayItem && (
                      <p className="mt-1 font-serif text-sm font-bold text-cyan-700 dark:text-cyan-300">
                        {holidayItem.recipient}
                      </p>
                    )}
                  </div>

                  {/* People list (Max 2 visible at once, scrollable container) */}
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {personalPeople.length > 0 ? "People to gift:" : "Suggested Recipients:"}
                  </p>

                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {peopleForPopover.map((p, idx) => {
                      const giftQuery = `Gift ideas for ${p.name}${holidayItem ? ` for ${holidayItem.recipient}` : p.label ? ` for ${p.label}` : ""}`;
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{p.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{p.label}</p>
                          </div>
                          <Link
                            href={`/gift?q=${encodeURIComponent(giftQuery)}`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-givit-ember px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-givit-ember-hover transition-transform hover:scale-105"
                          >
                            Gift me! <Gift className="h-3 w-3" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Details Drawer */}
      {selectedOccasions && selectedOccasions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          {selectedOccasions.map((o, i) => {
            const parsed = new Date(`${o.date}T12:00:00`);
            const daysUntil = daysUntilNextOccurrence(parsed.getMonth(), parsed.getDate(), today);
            const scheduled = !o.isHoliday && scheduledKeys?.has(`${o.recipient}-${o.label}-${o.date}`);
            return (
              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${o.isHoliday ? "bg-cyan-500/10 text-cyan-900 dark:text-cyan-200" : "bg-muted/40"}`}>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    {o.isHoliday ? (
                      <>
                        <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{o.recipient}</span>
                      </>
                    ) : (
                      <span>{o.recipient} · {o.label}</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    {o.isHoliday ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Public Holiday</span>
                    ) : scheduled ? (
                      <><Bell className="h-3 w-3 text-givit-ember" /> Reminder scheduled</>
                    ) : (
                      "No reminder scheduled"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/gift?q=${encodeURIComponent(`Gift ideas for ${o.recipient}`)}`}
                    className="inline-flex items-center gap-1 rounded-full bg-givit-ember px-2.5 py-1 text-[11px] font-bold text-white hover:bg-givit-ember-hover"
                  >
                    Gift me! <Gift className="h-3 w-3" />
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${o.isHoliday ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" : "bg-givit-ember/10 text-givit-ember"}`}>
                    {relativeLabel(daysUntil)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
