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

// Ages worth calling out specifically -- every decade, plus the handful of
// culturally-significant non-decade ones. Anything else just shows as a
// normal upcoming birthday with no special badge.
const MILESTONE_AGES = new Set([1, 5, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 65, 70, 75, 80, 90, 100]);

export function isMilestoneAge(age: number | null): boolean {
  return age !== null && MILESTONE_AGES.has(age);
}
