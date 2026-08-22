import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// First + last initial (e.g. "Bob Mark" -> "BM") for avatar circles --
// a single first-name letter reads ambiguous once there's more than one
// saved person with the same first initial.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

// SNS requires E.164 (+1XXXXXXXXXX) for both sending an SMS and for
// matching an inbound STOP/START reply back to a profile by phone number --
// a number saved exactly as typed ("555-123-4567") silently breaks both.
// US/Canada-only for now, matching the rest of the SMS pipeline's existing
// assumption (no country selector exists anywhere in the app). Returns null
// when the input can't be confidently normalized, so the caller can reject
// it up front instead of saving something that fails silently later.
export function normalizePhoneE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\+[1-9]\d{9,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
