import { createClient } from "@/lib/supabase/server";

export async function getOrCreateCartId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
