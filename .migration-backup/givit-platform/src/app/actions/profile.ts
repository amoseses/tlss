"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const company_name = String(formData.get("company_name") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      company_name: company_name || null,
    })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/account");
}
