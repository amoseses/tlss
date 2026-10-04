import { useEffect, useState } from "react";

import { birthDateFromCurrentAge, currentAgeFromBirthDate, daysInMonth, isoDateFromParts } from "@/lib/date-utils";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Age + month/day control for Birthday occasions (People page and the
// AutoGift onboarding wizard), instead of a year-inclusive date picker
// nobody wants to scroll back 30+ years in. `value` stays a real ISO date
// underneath -- the age just picks its year.
//
// The age box keeps its own raw text so it can be cleared and retyped
// (deriving it from `value` on every render made the last digit
// undeletable, so "35" -> "42" became "342"). A date is only emitted once
// the age is a real 0-130 number; picking a month/day before that keeps
// whatever year is already stored instead of inventing age 0 (which showed
// a bogus "Turning 1" milestone, and reset year-less ICS imports).
export function BirthdayAgeInput({
  value,
  onChange,
  inputClassName,
  selectClassName,
}: {
  value: string;
  onChange: (iso: string) => void;
  inputClassName: string;
  selectClassName: string;
}) {
  const today = new Date();
  const [ageText, setAgeText] = useState(() => String(currentAgeFromBirthDate(value)));
  const [month, setMonth] = useState(() => (value ? Number(value.slice(5, 7)) : today.getMonth() + 1));
  const [day, setDay] = useState(() => (value ? Number(value.slice(8, 10)) : today.getDate()));

  // Re-sync when the date changes from outside (switching which person is
  // being edited, a draft restored from storage) -- but not on our own
  // emits, which already match local state.
  useEffect(() => {
    if (!value) return;
    const m = Number(value.slice(5, 7));
    const d = Number(value.slice(8, 10));
    setMonth(m);
    setDay(d);
    setAgeText((prev) => {
      const parsed = parseAge(prev);
      return parsed !== null && birthDateFromCurrentAge(parsed, m, d) === value ? prev : String(currentAgeFromBirthDate(value));
    });
  }, [value]);

  function emit(nextAgeText: string, nextMonth: number, nextDay: number) {
    const age = parseAge(nextAgeText);
    if (age !== null) {
      onChange(birthDateFromCurrentAge(age, nextMonth, nextDay));
    } else if (value) {
      onChange(isoDateFromParts(Number(value.slice(0, 4)), nextMonth, nextDay));
    }
  }

  const maxDay = daysInMonth(month);
  const ageInvalid = ageText !== "" && parseAge(ageText) === null;

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={130}
        value={ageText}
        onChange={(e) => {
          setAgeText(e.target.value);
          emit(e.target.value, month, day);
        }}
        placeholder="Age"
        title={ageInvalid ? "Enter an age between 0 and 130" : "Current age"}
        aria-label="Current age"
        aria-invalid={ageInvalid || undefined}
        className={`${inputClassName}${ageInvalid ? " border-destructive" : ""}`}
      />
      <select
        value={month}
        aria-label="Birth month"
        onChange={(e) => {
          const nextMonth = Number(e.target.value);
          const nextDay = Math.min(day, daysInMonth(nextMonth));
          setMonth(nextMonth);
          setDay(nextDay);
          emit(ageText, nextMonth, nextDay);
        }}
        className={selectClassName}
      >
        {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={Math.min(day, maxDay)}
        aria-label="Birth day"
        onChange={(e) => {
          const nextDay = Number(e.target.value);
          setDay(nextDay);
          emit(ageText, month, nextDay);
        }}
        className={selectClassName}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}

function parseAge(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const age = Number(text);
  return age <= 130 ? age : null;
}
