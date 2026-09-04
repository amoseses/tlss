/// <reference path="../mjs-modules.d.ts" />
// Both AutoGift Stripe actions live in one Vercel Function, differentiated
// by HTTP method rather than a path segment -- same reasoning as
// api/auth/google-calendar/callback.ts: a [action].ts bracket route
// doesn't actually get served by Vercel for this project (confirmed live:
// requests fall through to the SPA rewrite instead of the function), and
// staying under the Hobby-plan 12 Function limit means this can't just be
// two separate files either.
// POST = start a SetupIntent so Stripe Elements can collect a card.
// POST ?action=charge_order&orderId= = admin-only: actually charge an
// AutoGift order's saved default card (the real charge mechanism -- until
// this existed, "Charge saved card" in /admin only flipped a status flag).
// GET (?paymentMethodId=) = look up the resulting card's brand/last4 --
// Stripe.js deliberately never hands that back to the browser itself.
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { getOrCreateStripeCustomer, getPaymentMethodSummary } from "../../server/api-lib/payments.mjs";
import { getStripe } from "../../server/api-lib/stripe.mjs";
import { restFetch } from "../../server/api-lib/supabase-rest.mjs";

const UNCHARGEABLE_STATUSES = new Set(["charged", "admin_fulfillment", "ordered", "shipped", "delivered", "cancelled"]);

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

async function chargeAutoGiftOrder(req: any, res: any) {
  try {
    const admin = await getUserFromRequest(req);
    if (!admin) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }

    const orderId = req.query?.orderId;
    if (!orderId || typeof orderId !== "string") {
      res.status(400).json({ error: "Missing orderId." });
      return;
    }

    // Never trust a client-supplied "I'm an admin" flag -- re-check the
    // caller's role server-side against their own profile row.
    const adminRows = await restFetch(`profiles?id=eq.${admin.id}&select=role`);
    if (adminRows?.[0]?.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const orderRows = await restFetch(`autogift_orders?id=eq.${orderId}&select=*`);
    const order = orderRows?.[0];
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    // Idempotency guard: a stored payment_intent_id or a status already
    // past "approved" means this order was already charged (or is being
    // fulfilled/was cancelled) -- refuse a second charge attempt outright
    // rather than relying only on Stripe's idempotency key below.
    if (order.stripe_payment_intent_id || UNCHARGEABLE_STATUSES.has(order.status)) {
      res.status(409).json({ error: `Order is already ${order.status}.`, status: order.status });
      return;
    }

    const pmRows = await restFetch(`user_payment_methods?user_id=eq.${order.user_id}&is_default=eq.true&select=*`);
    const paymentMethod = pmRows?.[0];
    if (!paymentMethod?.stripe_payment_method_id) {
      res.status(400).json({ error: "This customer has no saved default card on file." });
      return;
    }

    const ownerRows = await restFetch(`profiles?id=eq.${order.user_id}&select=email`);
    const customerId = await getOrCreateStripeCustomer(order.user_id, ownerRows?.[0]?.email);
    const stripe = getStripe();

    const intent = await stripe.paymentIntents.create(
      {
        amount: order.total_cents,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethod.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { source: "givit_autogift_charge", order_id: order.id, user_id: order.user_id },
      },
      // Guards against a duplicate PaymentIntent if this request is retried
      // (double-click, network retry) -- Stripe returns the same intent
      // instead of charging the card twice.
      { idempotencyKey: `autogift-charge-${order.id}` },
    );

    if (intent.status !== "succeeded") {
      res.status(402).json({ error: `Charge did not complete (status: ${intent.status}).` });
      return;
    }

    // The card has genuinely been charged at this point -- a failure past
    // this line must never surface as "the charge failed" (it didn't), or
    // an admin could tell a customer nothing happened and double-charge
    // them via a retry. One retry covers a transient blip; if it still
    // fails, still report success (with a warning) since the idempotency
    // key above makes a manual retry of this whole action safe either way.
    let persistError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await restFetch(`autogift_orders?id=eq.${order.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "charged", stripe_payment_intent_id: intent.id }),
        });
        persistError = null;
        break;
      } catch (err: any) {
        persistError = err?.message || "Unknown error";
      }
    }
    if (persistError) console.error("Charged order but failed to persist status:", order.id, persistError);

    res.status(200).json({
      status: "charged",
      paymentIntentId: intent.id,
      warning: persistError ? "Card was charged, but the order status couldn't be updated. Refresh and retry this action to sync it." : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: safeStripeErrorMessage(error, "Couldn't charge the saved card. Please try again shortly.") });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST" && req.query?.action === "charge_order") return chargeAutoGiftOrder(req, res);
  if (req.method === "POST") return startSetupIntent(req, res);
  if (req.method === "GET") return paymentMethodSummary(req, res);
  res.status(405).json({ error: "Method not allowed" });
}
