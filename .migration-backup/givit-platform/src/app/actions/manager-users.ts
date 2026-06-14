"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import type { UserRole } from "@/types/database";

export async function managerSetUserRoleAction(userId: string, role: UserRole) {
  const { supabase } = await requirePlatformAdmin();

  const { error } = await supabase.rpc("manager_set_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/manager/users");
  revalidatePath("/manager");
}

export async function managerSetUserBannedAction(
  userId: string,
  banned: boolean,
  reason?: string,
) {
  const { supabase } = await requirePlatformAdmin();

  const { error } = await supabase.rpc("manager_set_user_banned", {
    p_user_id: userId,
    p_banned: banned,
    p_reason: reason ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/manager/users");
  revalidatePath("/manager");
}
