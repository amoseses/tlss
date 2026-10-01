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
// year behind an age the person actually knows offhand. Reuses
// nextOccurrenceDate's own "has this year's occurrence already passed"
// logic rather than re-comparing month/day separately.
export function currentAgeFromBirthDate(dateStr: string, from: Date = new Date()): number | "" {
  if (!dateStr) return "";
  const year = Number(dateStr.slice(0, 4));
  if (!year) return "";
  const hadBirthdayThisYear = nextOccurrenceDate(dateStr, from).getFullYear() > from.getFullYear();
  const age = from.getFullYear() - year - (hadBirthdayThisYear ? 0 : 1);
  return age >= 0 && age <= 130 ? age : "";
}

export function birthDateFromCurrentAge(age: number, month: number, day: number, from: Date = new Date()): string {
  const probe = `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const hadBirthdayThisYear = nextOccurrenceDate(probe, from).getFullYear() > from.getFullYear();
  const year = from.getFullYear() - age - (hadBirthdayThisYear ? 0 : 1);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Ages worth calling out specifically -- every decade, plus the handful of
// culturally-significant non-decade ones. Anything else just shows as a
// normal upcoming birthday with no special badge.
const MILESTONE_AGES = new Set([1, 5, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 65, 70, 75, 80, 90, 100]);

export function isMilestoneAge(age: number | null): boolean {
  return age !== null && MILESTONE_AGES.has(age);
}
