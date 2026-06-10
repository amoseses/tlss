import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: profile, error } = await supabase.from("profiles").select("email, full_name, stripe_customer_id").eq("id", user.id).single();
  if (error || !profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const stripe = getStripe();
  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? user.email ?? undefined,
      name: profile.full_name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { user_id: user.id, purpose: "givit_concierge" },
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId });
}
