// Shared validation for AutoGift's shipping addresses and occasion dates.
// Every surface that collects these (onboarding wizard, /account, /people,
// the gift survey modal) funnels through here so "invalid address" and
// "birthday in the future" mean the same thing everywhere.

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
  // Not states, but real USPS-served addresses -- without these, anyone
  // shipping to Puerto Rico, Guam, etc. would be wrongly told they entered
  // an invalid state.
  "PR", "GU", "VI", "AS", "MP",
]);

const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
  "puerto rico": "PR", guam: "GU", "virgin islands": "VI", "u.s. virgin islands": "VI",
  "american samoa": "AS", "northern mariana islands": "MP",
};

export function normalizeUsState(state: string): string | null {
  const trimmed = state.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z]{2}$/.test(trimmed) && US_STATE_CODES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return US_STATE_NAMES[trimmed.toLowerCase()] ?? null;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

function isValidAddressLine1(line1: string): boolean {
  const trimmed = line1.trim();
  // A real street address has some digits (the house/unit number) and some
  // letters (the street name) -- "asdf" or "123" alone shouldn't pass.
  return trimmed.length >= 5 && /\d/.test(trimmed) && /[a-zA-Z]/.test(trimmed);
}

function isValidCity(city: string): boolean {
  return /^[a-zA-Z][a-zA-Z\s.'-]{1,58}[a-zA-Z]$/.test(city.trim());
}

export type AddressLike = { line1: string; city: string; state: string; zip: string };

// Returns null when the address is valid, otherwise a user-facing message
// naming the first problem found.
export function addressValidationError(address: AddressLike): string | null {
  if (!address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.zip.trim()) {
    return "Fill in the street address, city, state, and ZIP.";
  }
  if (!isValidAddressLine1(address.line1)) return "Enter a valid street address, e.g. 123 Main St.";
  if (!isValidCity(address.city)) return "Enter a valid city name.";
  if (!normalizeUsState(address.state)) return "Enter a valid U.S. state, e.g. CA or California.";
  if (!isValidZip(address.zip)) return "Enter a valid ZIP code, e.g. 12345 or 12345-6789.";
  return null;
}

// Birthdays are the one occasion type that must be in the past (or today) --
// everything else (anniversaries, graduations, etc.) can legitimately be a
// future date. Comparison is by calendar day, not by timestamp, so a
// birthday dated "today" always passes regardless of time zone.
export function birthdayValidationError(dateStr: string): string | null {
  if (!dateStr) return "Enter a birthday.";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Enter a valid date.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime()) return "Birthday can't be in the future.";
  return null;
}
