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
