/**
 * Location detection & Public Holidays generator for Givit Calendar.
 * Supports auto-detecting user country from timezone and pre-calculated holidays for global regions.
 */

export type PublicHoliday = {
  name: string;
  date: string; // YYYY-MM-DD
  category: "cultural" | "national" | "observance";
  region: string;
};

export type SupportedRegion = {
  code: string;
  name: string;
  flag: string;
  gmt: string;
};

export const SUPPORTED_REGIONS: SupportedRegion[] = [
  // North America
  { code: "US", name: "United States", flag: "🇺🇸", gmt: "GMT-5" },
  { code: "CA", name: "Canada", flag: "🇨🇦", gmt: "GMT-5" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", gmt: "GMT-6" },
  // Europe
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", gmt: "GMT+0" },
  { code: "DE", name: "Germany", flag: "🇩🇪", gmt: "GMT+1" },
  { code: "FR", name: "France", flag: "🇫🇷", gmt: "GMT+1" },
  { code: "IT", name: "Italy", flag: "🇮🇹", gmt: "GMT+1" },
  { code: "ES", name: "Spain", flag: "🇪🇸", gmt: "GMT+1" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", gmt: "GMT+1" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", gmt: "GMT+1" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", gmt: "GMT+1" },
  { code: "PL", name: "Poland", flag: "🇵🇱", gmt: "GMT+1" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", gmt: "GMT+0" },
  // Asia & Middle East
  { code: "IN", name: "India", flag: "🇮🇳", gmt: "GMT+5:30" },
  { code: "JP", name: "Japan", flag: "🇯🇵", gmt: "GMT+9" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", gmt: "GMT+9" },
  { code: "CN", name: "China", flag: "🇨🇳", gmt: "GMT+8" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", gmt: "GMT+8" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", gmt: "GMT+4" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", gmt: "GMT+3" },
  { code: "IL", name: "Israel", flag: "🇮🇱", gmt: "GMT+2" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", gmt: "GMT+7" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", gmt: "GMT+8" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", gmt: "GMT+7" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", gmt: "GMT+7" },
  // Oceania
  { code: "AU", name: "Australia", flag: "🇦🇺", gmt: "GMT+10" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", gmt: "GMT+12" },
  // Latin America
  { code: "BR", name: "Brazil", flag: "🇧🇷", gmt: "GMT-3" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", gmt: "GMT-3" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", gmt: "GMT-5" },
  { code: "CL", name: "Chile", flag: "🇨🇱", gmt: "GMT-4" },
  // Africa
  { code: "ZA", name: "South Africa", flag: "🇿🇦", gmt: "GMT+2" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", gmt: "GMT+1" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", gmt: "GMT+3" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", gmt: "GMT+2" },
];

function formatIso(year: number, monthZeroBased: number, day: number): string {
  const m = String(monthZeroBased + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function nthWeekdayOf(year: number, monthZeroBased: number, weekday: number, nth: number): Date {
  const first = new Date(year, monthZeroBased, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  return new Date(year, monthZeroBased, day);
}

function lastWeekdayOf(year: number, monthZeroBased: number, weekday: number): Date {
  const lastDay = new Date(year, monthZeroBased + 1, 0).getDate();
  const last = new Date(year, monthZeroBased, lastDay);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthZeroBased, lastDay - diff);
}

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

/**
 * Detect user country code based on browser timezone
 */
export function detectUserRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "US";

    if (tz.includes("Kolkata") || tz.includes("Calcutta")) return "IN";
    if (tz.includes("London")) return "GB";
    if (tz.includes("Toronto") || tz.includes("Vancouver") || tz.includes("Edmonton")) return "CA";
    if (tz.includes("Australia") || tz.includes("Sydney") || tz.includes("Melbourne")) return "AU";
    if (tz.includes("Tokyo")) return "JP";
    if (tz.includes("Seoul")) return "KR";
    if (tz.includes("Berlin")) return "DE";
    if (tz.includes("Paris")) return "FR";
    if (tz.includes("Rome")) return "IT";
    if (tz.includes("Madrid")) return "ES";
    if (tz.includes("Amsterdam")) return "NL";
    if (tz.includes("Stockholm")) return "SE";
    if (tz.includes("Zurich")) return "CH";
    if (tz.includes("Warsaw")) return "PL";
    if (tz.includes("Dublin")) return "IE";
    if (tz.includes("Singapore")) return "SG";
    if (tz.includes("Dubai")) return "AE";
    if (tz.includes("Riyadh")) return "SA";
    if (tz.includes("Jerusalem") || tz.includes("Tel_Aviv")) return "IL";
    if (tz.includes("Jakarta")) return "ID";
    if (tz.includes("Manila")) return "PH";
    if (tz.includes("Bangkok")) return "TH";
    if (tz.includes("Auckland")) return "NZ";
    if (tz.includes("Sao_Paulo")) return "BR";
    if (tz.includes("Buenos_Aires")) return "AR";
    if (tz.includes("Mexico_City")) return "MX";
    if (tz.includes("Johannesburg")) return "ZA";
    if (tz.includes("Cairo")) return "EG";
    if (tz.startsWith("America/")) return "US";
  } catch {
    // fallback
  }
  return "US";
}

/**
 * Get list of public holidays for a given region and year
 */
export function getHolidaysForRegion(regionCode: string, year: number): PublicHoliday[] {
  const list: PublicHoliday[] = [];

  // Global / Shared
  list.push({ name: "New Year's Day", date: formatIso(year, 0, 1), category: "national", region: "GLOBAL" });
  list.push({ name: "Valentine's Day", date: formatIso(year, 1, 14), category: "observance", region: "GLOBAL" });
  
  const easterDate = easter(year);
  list.push({ name: "Easter Sunday", date: formatIso(year, easterDate.getMonth(), easterDate.getDate()), category: "cultural", region: "GLOBAL" });
  
  const goodFriday = new Date(easterDate.getTime() - 2 * 86400000);
  list.push({ name: "Good Friday", date: formatIso(year, goodFriday.getMonth(), goodFriday.getDate()), category: "cultural", region: "GLOBAL" });

  list.push({ name: "Halloween", date: formatIso(year, 9, 31), category: "cultural", region: "GLOBAL" });
  list.push({ name: "Christmas Eve", date: formatIso(year, 11, 24), category: "cultural", region: "GLOBAL" });
  list.push({ name: "Christmas Day", date: formatIso(year, 11, 25), category: "national", region: "GLOBAL" });
  list.push({ name: "New Year's Eve", date: formatIso(year, 11, 31), category: "observance", region: "GLOBAL" });

  // US Specific
  if (regionCode === "US") {
    const mlk = nthWeekdayOf(year, 0, 1, 3);
    list.push({ name: "Martin Luther King Jr. Day", date: formatIso(year, mlk.getMonth(), mlk.getDate()), category: "national", region: "US" });

    const presidents = nthWeekdayOf(year, 1, 1, 3);
    list.push({ name: "Presidents' Day", date: formatIso(year, presidents.getMonth(), presidents.getDate()), category: "national", region: "US" });

    const mothersDay = nthWeekdayOf(year, 4, 0, 2);
    list.push({ name: "Mother's Day", date: formatIso(year, mothersDay.getMonth(), mothersDay.getDate()), category: "observance", region: "US" });

    const memorial = lastWeekdayOf(year, 4, 1);
    list.push({ name: "Memorial Day", date: formatIso(year, memorial.getMonth(), memorial.getDate()), category: "national", region: "US" });

    const fathersDay = nthWeekdayOf(year, 5, 0, 3);
    list.push({ name: "Father's Day", date: formatIso(year, fathersDay.getMonth(), fathersDay.getDate()), category: "observance", region: "US" });

    list.push({ name: "Juneteenth", date: formatIso(year, 5, 19), category: "national", region: "US" });
    list.push({ name: "Independence Day", date: formatIso(year, 6, 4), category: "national", region: "US" });

    const labor = nthWeekdayOf(year, 8, 1, 1);
    list.push({ name: "Labor Day", date: formatIso(year, labor.getMonth(), labor.getDate()), category: "national", region: "US" });

    const thanksgiving = nthWeekdayOf(year, 10, 4, 4);
    list.push({ name: "Thanksgiving Day", date: formatIso(year, thanksgiving.getMonth(), thanksgiving.getDate()), category: "national", region: "US" });
  }

  // India Specific
  if (regionCode === "IN") {
    list.push({ name: "Republic Day", date: formatIso(year, 0, 26), category: "national", region: "IN" });
    list.push({ name: "Independence Day", date: formatIso(year, 7, 15), category: "national", region: "IN" });
    list.push({ name: "Gandhi Jayanti", date: formatIso(year, 9, 2), category: "national", region: "IN" });
    list.push({ name: "Holi", date: formatIso(year, 2, 14), category: "cultural", region: "IN" });
    list.push({ name: "Diwali", date: formatIso(year, 10, 8), category: "cultural", region: "IN" });
    list.push({ name: "Raksha Bandhan", date: formatIso(year, 7, 28), category: "cultural", region: "IN" });
  }

  // UK Specific
  if (regionCode === "GB") {
    const earlyMay = nthWeekdayOf(year, 4, 1, 1);
    list.push({ name: "Early May Bank Holiday", date: formatIso(year, earlyMay.getMonth(), earlyMay.getDate()), category: "national", region: "GB" });
    const springBank = lastWeekdayOf(year, 4, 1);
    list.push({ name: "Spring Bank Holiday", date: formatIso(year, springBank.getMonth(), springBank.getDate()), category: "national", region: "GB" });
    const summerBank = lastWeekdayOf(year, 7, 1);
    list.push({ name: "Summer Bank Holiday", date: formatIso(year, summerBank.getMonth(), summerBank.getDate()), category: "national", region: "GB" });
    list.push({ name: "Boxing Day", date: formatIso(year, 11, 26), category: "national", region: "GB" });
  }

  // Canada Specific
  if (regionCode === "CA") {
    const victoria = lastWeekdayOf(year, 4, 1);
    list.push({ name: "Victoria Day", date: formatIso(year, victoria.getMonth(), victoria.getDate()), category: "national", region: "CA" });
    list.push({ name: "Canada Day", date: formatIso(year, 6, 1), category: "national", region: "CA" });
    const caThanksgiving = nthWeekdayOf(year, 9, 1, 2);
    list.push({ name: "Thanksgiving", date: formatIso(year, caThanksgiving.getMonth(), caThanksgiving.getDate()), category: "national", region: "CA" });
    list.push({ name: "Remembrance Day", date: formatIso(year, 10, 11), category: "national", region: "CA" });
    list.push({ name: "Boxing Day", date: formatIso(year, 11, 26), category: "national", region: "CA" });
  }

  // Australia Specific
  if (regionCode === "AU") {
    list.push({ name: "Australia Day", date: formatIso(year, 0, 26), category: "national", region: "AU" });
    list.push({ name: "ANZAC Day", date: formatIso(year, 3, 25), category: "national", region: "AU" });
    const kingsBirthday = nthWeekdayOf(year, 5, 1, 2);
    list.push({ name: "King's Birthday", date: formatIso(year, kingsBirthday.getMonth(), kingsBirthday.getDate()), category: "national", region: "AU" });
    list.push({ name: "Boxing Day", date: formatIso(year, 11, 26), category: "national", region: "AU" });
  }

  // Japan Specific
  if (regionCode === "JP") {
    list.push({ name: "Coming of Age Day", date: formatIso(year, 0, 12), category: "national", region: "JP" });
    list.push({ name: "National Foundation Day", date: formatIso(year, 1, 11), category: "national", region: "JP" });
    list.push({ name: "Emperor's Birthday", date: formatIso(year, 1, 23), category: "national", region: "JP" });
    list.push({ name: "Showa Day", date: formatIso(year, 3, 29), category: "national", region: "JP" });
    list.push({ name: "Constitution Memorial Day", date: formatIso(year, 4, 3), category: "national", region: "JP" });
    list.push({ name: "Greenery Day", date: formatIso(year, 4, 4), category: "national", region: "JP" });
    list.push({ name: "Children's Day", date: formatIso(year, 4, 5), category: "national", region: "JP" });
    list.push({ name: "Mountain Day", date: formatIso(year, 7, 11), category: "national", region: "JP" });
    list.push({ name: "Culture Day", date: formatIso(year, 10, 3), category: "national", region: "JP" });
    list.push({ name: "Labor Thanksgiving Day", date: formatIso(year, 10, 23), category: "national", region: "JP" });
  }

  // Germany Specific
  if (regionCode === "DE") {
    list.push({ name: "Labour Day", date: formatIso(year, 4, 1), category: "national", region: "DE" });
    list.push({ name: "German Unity Day", date: formatIso(year, 9, 3), category: "national", region: "DE" });
    list.push({ name: "St. Stephen's Day", date: formatIso(year, 11, 26), category: "national", region: "DE" });
  }

  // France Specific
  if (regionCode === "FR") {
    list.push({ name: "Labor Day", date: formatIso(year, 4, 1), category: "national", region: "FR" });
    list.push({ name: "Victory Day", date: formatIso(year, 4, 8), category: "national", region: "FR" });
    list.push({ name: "Bastille Day", date: formatIso(year, 6, 14), category: "national", region: "FR" });
    list.push({ name: "Assumption of Mary", date: formatIso(year, 7, 15), category: "cultural", region: "FR" });
    list.push({ name: "All Saints' Day", date: formatIso(year, 10, 1), category: "cultural", region: "FR" });
    list.push({ name: "Armistice Day", date: formatIso(year, 10, 11), category: "national", region: "FR" });
  }

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
