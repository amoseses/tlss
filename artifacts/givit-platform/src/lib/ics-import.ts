// Parses a .ics calendar export (Google/Apple/Outlook all produce this
// format when you export a calendar) well enough to pull out birthday- and
// anniversary-shaped events. This deliberately avoids OAuth/Calendar-API
// integration -- that needs a registered app + client credentials the user
// would have to set up in an external console -- while still delivering
// "import my birthdays from my calendar" with zero external dependencies.
export type ParsedCalendarEvent = {
  summary: string;
  /** ISO yyyy-mm-dd of the (first, if recurring) occurrence */
  date: string;
  recurringYearly: boolean;
  guessedName: string;
  guessedOccasion: "Birthday" | "Anniversary" | "Other";
};

function unfoldLines(ics: string): string[] {
  // RFC 5545: a line starting with a space/tab is a continuation of the
  // previous line -- has to be undone before parsing key/value pairs.
  const raw = ics.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseDate(value: string): string | null {
  const match = value.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m}-${d}`;
}

// Strips the common "X's Birthday" / "Birthday - X" export phrasing down to
// just the person's name, since that's what GIVIT actually needs.
function guessName(summary: string): string {
  let name = summary.trim();
  name = name.replace(/[’']s\s+(birthday|anniversary)$/i, "");
  name = name.replace(/^(birthday|anniversary)\s*[-–:]\s*/i, "");
  name = name.replace(/\s*[-–:]\s*(birthday|anniversary)$/i, "");
  name = name.replace(/\s*\(birthday\)$/i, "");
  return name.trim() || summary.trim();
}

function guessOccasion(summary: string): ParsedCalendarEvent["guessedOccasion"] {
  if (/birthday/i.test(summary)) return "Birthday";
  if (/anniversary/i.test(summary)) return "Anniversary";
  return "Other";
}

export function parseIcs(ics: string): ParsedCalendarEvent[] {
  const lines = unfoldLines(ics);
  const events: ParsedCalendarEvent[] = [];
  let inEvent = false;
  let summary = "";
  let dtstart = "";
  let rrule = "";

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      summary = "";
      dtstart = "";
      rrule = "";
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      inEvent = false;
      const date = parseDate(dtstart);
      if (date && summary) {
        events.push({
          summary,
          date,
          recurringYearly: /FREQ=YEARLY/i.test(rrule),
          guessedName: guessName(summary),
          guessedOccasion: guessOccasion(summary),
        });
      }
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith("SUMMARY")) {
      summary = line.slice(line.indexOf(":") + 1).trim();
    } else if (line.startsWith("DTSTART")) {
      dtstart = line.slice(line.indexOf(":") + 1).trim();
    } else if (line.startsWith("RRULE")) {
      rrule = line.slice(line.indexOf(":") + 1).trim();
    }
  }

  return events;
}
