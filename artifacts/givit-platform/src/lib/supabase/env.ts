/**
 * Supabase URL + anon key for browser and server clients.
 *
 * In **development**, if either variable is missing, we use placeholders so Next.js
 * can boot (middleware, pages) while you style the UI. Data and auth will not work
 * until you set real values in `.env.local`.
 *
 * In **production**, both must be set or we throw (matches @supabase/ssr validation).
 */

/** Project URL only — not .../rest/v1 (supabase-js adds that). */
export function normalizeSupabaseUrl(raw: string): string {
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1\/?$/i, "");
  return url;
}

export function getSupabasePublishableEnv(): { url: string; anonKey: string } {
  // Trim whitespace including leading spaces caused by .env formatting
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  
  // Log warning if we detect common issues
  if (rawUrl?.startsWith(" ")) console.warn("[supabase/env] VITE_SUPABASE_URL has leading whitespace - trimming");
  if (rawKey?.startsWith(" ")) console.warn("[supabase/env] VITE_SUPABASE_ANON_KEY has leading whitespace - trimming");

  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : undefined;
  const anonKey =
    rawKey &&
    ((rawKey.startsWith('"') && rawKey.endsWith('"')) ||
      (rawKey.startsWith("'") && rawKey.endsWith("'")))
      ? rawKey.slice(1, -1).trim()
      : rawKey;

  if (url && anonKey) {
    return { url, anonKey };
  }

  return {
    url: url || "https://placeholder.supabase.co",
    anonKey: anonKey || "sb_publishable_dev_placeholder_not_for_production",
  };
}
