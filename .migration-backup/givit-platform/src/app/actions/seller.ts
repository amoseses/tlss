"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function registerAsSellerAction(input: {
  company_name: string;
  business_description?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const company_name = input.company_name.trim();
  if (!company_name) throw new Error("Company name is required");

  const { data, error } = await supabase.rpc("register_as_seller", {
    p_business_description: input.business_description?.trim() || null,
    p_company_name: company_name,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/account");
  revalidatePath("/account/become-seller");
  revalidatePath("/admin");

  return { role: data as string };
}
