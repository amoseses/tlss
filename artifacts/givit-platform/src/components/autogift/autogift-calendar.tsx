import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Occasion = { label: string; date: string };
type Recipient = { id: string; name: string; occasions: Occasion[] };

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Compact month-grid calendar for AutoGift — dates recur yearly, so a day
 * is marked whenever any occasion falls on that month/day, regardless of
 * which year is stored. Purely visual overview; the detailed "who and
 * when" list still lives in the Upcoming panel next to it.
 */
export function AutoGiftCalendar({ recipients }: { recipients: Recipient[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const occasionsByDay = useMemo(() => {
    const map = new Map<number, Array<{ recipient: string; label: string }>>();
    for (const r of recipients) {
      for (const o of r.occasions) {
        if (!o.date) continue;
        const d = new Date(`${o.date}T12:00:00`);
        if (Number.isNaN(d.getTime()) || d.getMonth() !== cursor.month) continue;
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), { recipient: r.name, label: o.label }]);
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

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
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
          return (
            <div
              key={i}
              title={dayOccasions?.map((o) => `${o.recipient}: ${o.label}`).join(", ")}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-xs transition ${
                !day
                  ? ""
                  : isToday
                    ? "givit-gradient font-bold text-white shadow-sm"
                    : dayOccasions
                      ? "bg-givit-ember/10 font-semibold text-givit-ember"
                      : "text-foreground hover:bg-muted"
              }`}
            >
              {day}
              {dayOccasions && !isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-givit-coral" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
