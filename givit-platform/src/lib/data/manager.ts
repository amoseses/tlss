import { cache } from "react";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import type { Feedback, Order, Profile } from "@/types/database";

export const getManagerStats = cache(async () => {
  const { supabase } = await requirePlatformAdmin();

  const [profiles, feedback, orders] = await Promise.all([
    supabase.from("profiles").select("role, is_banned"),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  if (profiles.error) throw profiles.error;
  if (feedback.error) throw feedback.error;
  if (orders.error) throw orders.error;

  const rows = (profiles.data ?? []) as Pick<Profile, "role" | "is_banned">[];

  return {
    buyers: rows.filter((p) => p.role === "customer").length,
    sellers: rows.filter((p) => p.role === "staff").length,
    admins: rows.filter((p) => p.role === "admin").length,
    banned: rows.filter((p) => p.is_banned).length,
    feedback: feedback.count ?? 0,
    orders: orders.count ?? 0,
  };
});

export type ManagerUser = Profile;

export const getManagerUsers = cache(async (filter?: "all" | "buyers" | "sellers" | "banned") => {
  const { supabase } = await requirePlatformAdmin();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter === "buyers") query = query.eq("role", "customer").eq("is_banned", false);
  else if (filter === "sellers") query = query.eq("role", "staff");
  else if (filter === "banned") query = query.eq("is_banned", true);

  const { data, error } = await query;
  if (error) throw error;
  return data as ManagerUser[];
});

export const getManagerFeedback = cache(async () => {
  const { supabase } = await requirePlatformAdmin();

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Feedback[];
});

export const getManagerOrders = cache(async () => {
  const { supabase } = await requirePlatformAdmin();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Order[];
});
