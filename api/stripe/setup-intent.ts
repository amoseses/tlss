/// <reference path="../mjs-modules.d.ts" />
// Both AutoGift Stripe actions live in one Vercel Function, differentiated
// by HTTP method rather than a path segment -- same reasoning as
// api/auth/google-calendar/callback.ts: a [action].ts bracket route
// doesn't actually get served by Vercel for this project (confirmed live:
// requests fall through to the SPA rewrite instead of the function), and
// staying under the Hobby-plan 12 Function limit means this can't just be
// two separate files either.
// POST = start a SetupIntent so Stripe Elements can collect a card.
// GET (?paymentMethodId=) = look up the resulting card's brand/last4 --
// Stripe.js deliberately never hands that back to the browser itself.
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { getOrCreateStripeCustomer, getPaymentMethodSummary } from "../../server/api-lib/payments.mjs";
import { getStripe } from "../../server/api-lib/stripe.mjs";

// Stripe's own error messages are safe to show verbatim only for
// StripeCardError (customer-facing declines, e.g. "Your card was
// declined.") -- every other Stripe error type is a server-side
// configuration/auth problem, and some (an expired/revoked secret key)
// literally embed a fragment of the key itself in the message text.
// Logging the real error server-side and returning a generic message
// for anything else is what keeps that out of the response body.
function safeStripeErrorMessage(error: any, fallback: string): string {
  console.error("Stripe error:", error?.type, error?.message);
  if (error?.type === "StripeCardError") return error.message;
  return fallback;
}

async function startSetupIntent(req: any, res: any) {
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
    res.status(500).json({ error: safeStripeErrorMessage(error, "Couldn't start payment setup. Please try again shortly.") });
  }
}

async function paymentMethodSummary(req: any, res: any) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }

    const paymentMethodId = req.query?.paymentMethodId;
    if (!paymentMethodId || typeof paymentMethodId !== "string") {
      res.status(400).json({ error: "Missing paymentMethodId." });
      return;
    }

    const summary = await getPaymentMethodSummary(paymentMethodId);
    res.status(200).json(summary);
  } catch (error: any) {
    res.status(500).json({ error: safeStripeErrorMessage(error, "Card was saved, but details couldn't be confirmed.") });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST") return startSetupIntent(req, res);
  if (req.method === "GET") return paymentMethodSummary(req, res);
  res.status(405).json({ error: "Method not allowed" });
}
