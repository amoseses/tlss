// Occasions are saved with a real calendar date, and for birthdays that
// date carries the recipient's actual birth year (e.g. "1985-07-29") since
// that's what a user naturally types. Comparing that raw date against
// "today" makes every birthday look like it happened decades ago, so nothing
// with a past year ever counts as "upcoming." This finds the next real
// occurrence (same month/day, this year or next) regardless of the year
// actually stored.
export function nextOccurrenceDate(dateStr: string, from: Date = new Date()): Date {
  const stored = new Date(`${dateStr}T00:00:00`);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), stored.getMonth(), stored.getDate());
  if (next < today) next = new Date(from.getFullYear() + 1, stored.getMonth(), stored.getDate());
  return next;
}

// The age someone turns on their NEXT birthday, computed from the real
// birth year already saved on the occasion (a plain <input type="date">
// always collects a full year, there's no "unknown year" path -- so this
// is a real number, not a guess). Returns null for anything under ~1 (a
// same-day-as-birth entry, or a clearly-fake year like 1900 used as a
// placeholder by some other tool) or over 130, since those almost
// certainly aren't real ages and showing "Turning 126" would read as
// broken rather than clever.
export function upcomingAge(dateStr: string, from: Date = new Date()): number | null {
  const stored = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(stored.getTime())) return null;
  const next = nextOccurrenceDate(dateStr, from);
  const age = next.getFullYear() - stored.getFullYear();
  return age >= 1 && age <= 130 ? age : null;
}

// Converts a birthday into "current age as of today" and back, so the UI
// can ask "how old are they" instead of making someone scroll a date picker
// back 30+ years to find a birth year. occasion_date still needs a real
// year underneath for upcomingAge() above to read -- these just hide that
// year behind an age the person actually knows offhand.
//
// "Had their birthday yet" is a plain month/day comparison where today
// itself counts as had -- reusing nextOccurrenceDate() here got that day
// wrong (it returns today for a birthday that's today), so someone turning
// 30 today showed as 29, and entering 30 stored a date that read "Turning 31".
function hadBirthdayThisYear(month: number, day: number, from: Date) {
  const m = from.getMonth() + 1;
  return m > month || (m === month && from.getDate() >= day);
}

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Feb gets 29 so leap-day birthdays stay selectable; birthDateFromCurrentAge
// handles the year not actually being a leap year.
export function daysInMonth(month: number, year = 2000) {
  return new Date(year, month, 0).getDate();
}

export function currentAgeFromBirthDate(dateStr: string, from: Date = new Date()): number | "" {
  if (!dateStr) return "";
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  if (!year || !month || !day) return "";
  const age = from.getFullYear() - year - (hadBirthdayThisYear(month, day, from) ? 0 : 1);
  return age >= 0 && age <= 130 ? age : "";
}

export function birthDateFromCurrentAge(age: number, month: number, day: number, from: Date = new Date()): string {
  const year = from.getFullYear() - age - (hadBirthdayThisYear(month, day, from) ? 0 : 1);
  return isoDateFromParts(year, month, day);
}

// Always a real calendar date: a day past the end of the month (April 31,
// or Feb 29 in a non-leap year) is clamped to the month's last day instead
// of producing a string Postgres's DATE column rejects outright.
export function isoDateFromParts(year: number, month: number, day: number): string {
  const safeDay = Math.min(day, daysInMonth(month, year));
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

// YYYY-MM-DD in the browser's own timezone. toISOString() converts to UTC
// first, which turns local midnight into the previous day anywhere east of
// UTC (Christmas saved as Dec 24 in Europe/Asia).
export function toLocalIsoDate(d: Date): string {
  return isoDateFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// Parses a bare YYYY-MM-DD as LOCAL midnight. new Date("2026-12-25") is
// UTC midnight, which displays as Dec 24 anywhere in the Americas.
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`);
}

// Ages worth calling out specifically -- every decade, plus the handful of
// culturally-significant non-decade ones. Anything else just shows as a
// normal upcoming birthday with no special badge.
const MILESTONE_AGES = new Set([1, 5, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 65, 70, 75, 80, 90, 100]);

export function isMilestoneAge(age: number | null): boolean {
  return age !== null && MILESTONE_AGES.has(age);
}
