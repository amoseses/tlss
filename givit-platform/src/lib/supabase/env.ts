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
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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

  if (process.env.NODE_ENV === "development") {
    if (typeof globalThis !== "undefined" && !(globalThis as { __hiveSupabaseEnvWarned?: boolean }).__hiveSupabaseEnvWarned) {
      (globalThis as { __hiveSupabaseEnvWarned?: boolean }).__hiveSupabaseEnvWarned = true;
      console.warn(
        "[GIVIT] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — using dev placeholders. Add .env.local for real data and auth.",
      );
    }
    return {
      url: url || "https://placeholder.supabase.co",
      anonKey: anonKey || "sb_publishable_dev_placeholder_not_for_production",
    };
  }

  throw new Error(
    "Your project's URL and Key are required to create a Supabase client! " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment. " +
      "https://supabase.com/dashboard/project/_/settings/api",
  );
}
