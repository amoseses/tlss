import { NextRequest, NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { setupIntentId } = await request.json();
  if (!setupIntentId || typeof setupIntentId !== "string") {
    return NextResponse.json({ error: "setupIntentId is required." }, { status: 400 });
  }

  const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId);
  if (setupIntent.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: "SetupIntent does not belong to this account." }, { status: 403 });
  }

  await supabase.from("profiles").update({
    stripe_customer_id: typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id,
    stripe_default_payment_method_id: typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id,
  }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
