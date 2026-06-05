import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/manager");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (profile?.is_banned) redirect("/login?banned=1");
  if (profile?.role !== "admin") redirect("/");

  return { supabase, user, profile };
}
