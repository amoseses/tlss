// Minimal plain-JS mirror of the name/occasion guessing in
// src/lib/ics-import.ts

export function guessName(summary) {
  let name = (summary || "").trim();
  name = name.replace(/[’']s\s+(birthday|bday|b-day|anniversary|party)$/i, "");
  name = name.replace(/^(birthday|bday|b-day|anniversary)\s*[-–:]\s*/i, "");
  name = name.replace(/\s*[-–:]\s*(birthday|bday|b-day|anniversary)$/i, "");
  name = name.replace(/\s*\((birthday|bday|b-day)\)$/i, "");
  return name.trim() || summary.trim();
}

export function guessOccasion(summary) {
  if (/birthday|bday|b-day|born/i.test(summary)) return "Birthday";
  if (/anniversary|wedding/i.test(summary)) return "Anniversary";
  return "Special Occasion";
}

// A Google event's date lives in different places depending on whether it's
// an all-day event (start.date) or timed (start.dateTime)
export function eventDateIso(event) {
  const raw = event?.start?.date || event?.start?.dateTime;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}
