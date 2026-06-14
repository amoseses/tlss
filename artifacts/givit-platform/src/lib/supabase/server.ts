import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabasePublishableEnv();
  return createBrowserClient(url, anonKey);
}
