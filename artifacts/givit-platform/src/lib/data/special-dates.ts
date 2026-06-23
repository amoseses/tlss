/**
 * Special dates that auto-fill when applicable (Father's Day, Valentine's Day, etc.)
 */
export type SpecialDate = {
  name: string;
  getDate: (year: number) => Date;
  slug: string;
};

function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthWeekdayOf(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month, 1);
  let diff = (weekday - first.getDay() + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  return new Date(year, month, day);
}

export const SPECIAL_DATES: SpecialDate[] = [
  { name: "New Year's Day", getDate: (year) => new Date(year, 0, 1), slug: "new-years" },
  { name: "Valentine's Day", getDate: (year) => new Date(year, 1, 14), slug: "valentines-day" },
  { name: "Mother's Day", getDate: (year) => nthWeekdayOf(year, 4, 0, 2), slug: "mothers-day" },
  { name: "Father's Day", getDate: (year) => nthWeekdayOf(year, 5, 0, 3), slug: "fathers-day" },
  { name: "Easter", getDate: (year) => easter(year), slug: "easter" },
  { name: "Halloween", getDate: (year) => new Date(year, 9, 31), slug: "halloween" },
  { name: "Thanksgiving", getDate: (year) => nthWeekdayOf(year, 10, 4, 4), slug: "thanksgiving" },
  { name: "Christmas", getDate: (year) => new Date(year, 11, 25), slug: "christmas" },
  { name: "Hanukkah", getDate: (year) => new Date(year, 10, 28), slug: "hanukkah" },
  { name: "Kwanzaa", getDate: (year) => new Date(year, 11, 26), slug: "kwanzaa" },
  { name: "New Year's Eve", getDate: (year) => new Date(year, 11, 31), slug: "new-years-eve" },
];

export function getTodaySpecialDate(): SpecialDate | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayMs = today.getTime();
  const windowMs = 14 * 86400000;
  for (const sd of SPECIAL_DATES) {
    const date = sd.getDate(now.getFullYear());
    const sdMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (Math.abs(todayMs - sdMs) <= windowMs) return sd;
  }
  return null;
}

export function getSpecialDatesForYear(year: number): { name: string; date: Date; slug: string }[] {
  return SPECIAL_DATES.map((sd) => ({ name: sd.name, date: sd.getDate(year), slug: sd.slug }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}