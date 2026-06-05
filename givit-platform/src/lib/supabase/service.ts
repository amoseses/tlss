import { createClient } from "@supabase/supabase-js";

import { normalizeSupabaseUrl } from "@/lib/supabase/env";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for server-side commerce operations.",
    );
  }

  return createClient(normalizeSupabaseUrl(url), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
