"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function submitFeedbackAction(input: {
  subject: string;
  message: string;
  email?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || !message) throw new Error("Please fill in all required fields");

  if (user) {
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: input.email?.trim() ?? null,
      subject,
      message,
    });
    if (error) throw error;
  } else {
    const email = input.email?.trim();
    if (!email) throw new Error("Email is required for guest feedback");
    const { error } = await supabase.from("feedback").insert({
      user_id: null,
      email,
      subject,
      message,
    });
    if (error) throw error;
  }

  revalidatePath("/feedback");
}
