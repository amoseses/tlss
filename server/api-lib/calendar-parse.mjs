// Minimal plain-JS mirror of the name/occasion guessing in
// src/lib/ics-import.ts (that file is a frontend TS module bundled by
// Vite, not reachable from these Node serverless functions, so this is a
// deliberate small duplication rather than a shared import).
export function guessName(summary) {
  let name = (summary || "").trim();
  name = name.replace(/[’']s\s+(birthday|anniversary)$/i, "");
  name = name.replace(/^(birthday|anniversary)\s*[-–:]\s*/i, "");
  name = name.replace(/\s*[-–:]\s*(birthday|anniversary)$/i, "");
  name = name.replace(/\s*\(birthday\)$/i, "");
  return name.trim() || summary.trim();
}

export function guessOccasion(summary) {
  if (/birthday/i.test(summary)) return "Birthday";
  if (/anniversary/i.test(summary)) return "Anniversary";
  return "Other";
}

// A Google event's date lives in different places depending on whether it's
// an all-day event (start.date) or timed (start.dateTime) -- and recurring
// yearly events (birthdays) are always all-day.
export function eventDateIso(event) {
  const raw = event?.start?.date || event?.start?.dateTime;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}
