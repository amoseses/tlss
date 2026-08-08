/// <reference path="../mjs-modules.d.ts" />
// Single catch-all handler for the AutoGift Stripe flow (setup-intent +
// payment-method-summary) -- same reasoning as api/auth/google-calendar/
// [action].ts: keeps this under Vercel's Hobby-plan 12 Serverless Function
// limit while preserving the existing public API paths.
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { getOrCreateStripeCustomer, getPaymentMethodSummary } from "../../server/api-lib/payments.mjs";
import { getStripe } from "../../server/api-lib/stripe.mjs";

// Starts a real Stripe SetupIntent so the AutoGift onboarding wizard can
// collect a card via Stripe Elements -- raw card data goes straight to
// Stripe from the browser and never touches this server at all.
async function setupIntent(req: any, res: any) {
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
    const setup = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { source: "givit_autogift_setup", user_id: user.id },
    });

    res.status(200).json({ clientSecret: setup.client_secret });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't start payment setup." });
  }
}

// After the client confirms a SetupIntent, it only gets back a
// payment_method ID -- Stripe.js deliberately doesn't hand back card
// details in the browser. This looks the card up server-side (secret key)
// so the wizard can show/store a real brand and last 4 instead of ones
// computed client-side from a raw, untokenized number.
async function paymentMethodSummary(req: any, res: any) {
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

    const paymentMethodId = req.body?.paymentMethodId;
    if (!paymentMethodId || typeof paymentMethodId !== "string") {
      res.status(400).json({ error: "Missing paymentMethodId." });
      return;
    }

    const summary = await getPaymentMethodSummary(paymentMethodId);
    res.status(200).json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't retrieve card details." });
  }
}

export default async function handler(req: any, res: any) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;

  if (action === "setup-intent") return setupIntent(req, res);
  if (action === "payment-method-summary") return paymentMethodSummary(req, res);

  res.status(404).json({ error: "Stripe route not found." });
}
