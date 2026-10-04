import { createClient } from "@/lib/supabase/client";

// Bearer header for our own /api routes -- getUserFromRequest
// (server/api-lib/auth.mjs) only reads Authorization, never cookies.
// Empty when signed out, so the server answers 401 rather than this
// throwing.
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
