/// <reference path="../mjs-modules.d.ts" />
// Starts a real Stripe SetupIntent so the AutoGift onboarding wizard can
// collect a card via Stripe Elements -- raw card data goes straight to
// Stripe from the browser and never touches this server at all.
import { getUserFromRequest } from "../_lib/auth.mjs";
import { getOrCreateStripeCustomer } from "../_lib/payments.mjs";
import { getStripe } from "../_lib/stripe.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email);
    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { source: "givit_autogift_setup", user_id: user.id },
    });

    res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't start payment setup." });
  }
}
