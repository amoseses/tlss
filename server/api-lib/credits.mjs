// Thin wrapper around the spend_credits / grant_credits / get_credit_status
// Postgres functions (server/api-lib/credits_migration.sql). All the real
// logic -- free-tier draw-down, atomic balance checks, ledger writes --
// lives in those SQL functions so a spend can never race itself; this
// file just calls them over PostgREST's /rpc/ endpoint with the
// service-role key, same as every other _lib module.
import { restFetch } from "./supabase-rest.mjs";

export async function getCreditStatus(userId) {
  const rows = await restFetch(`rpc/get_credit_status`, {
    method: "POST",
    body: JSON.stringify({ p_user_id: userId }),
  });
  // Postgres functions returning a single JSONB value come back as the
  // bare value itself (not wrapped in an array) via PostgREST's rpc call.
  return rows;
}

export async function hasGrantedForPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return false;
  const rows = await restFetch(`credit_transactions?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&select=id&limit=1`);
  return Array.isArray(rows) && rows.length > 0;
}

export async function spendCredits(userId, amount, reason, referenceId) {
  const result = await restFetch(`rpc/spend_credits`, {
    method: "POST",
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reason: reason, p_reference_id: referenceId ?? null }),
  });
  return result;
}

export async function grantCredits(userId, amount, reason, stripePaymentIntentId) {
  const result = await restFetch(`rpc/grant_credits`, {
    method: "POST",
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reason: reason, p_stripe_payment_intent_id: stripePaymentIntentId ?? null }),
  });
  return result;
}

// ============================================================
// Credit pack purchases -- one-time Stripe Checkout charges, distinct
// from AutoGift's saved-card-for-later flow in api/stripe/setup-intent.ts.
// Prices/credit counts from credit-system-proposal.md §2.2; keep these
// two files in sync if pricing changes.
// ============================================================
export const CREDIT_PACKS = {
  starter: { credits: 20, amountCents: 599, label: "Starter" },
  standard: { credits: 45, amountCents: 1099, label: "Standard" },
};

function resolveAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
  if (process.env.VERCEL_URL?.trim()) return `https://${process.env.VERCEL_URL.trim()}`;
  return "http://localhost:3000";
}

export async function createCreditCheckoutSession(stripe, userId, userEmail, packId) {
  const pack = CREDIT_PACKS[packId];
  if (!pack) throw new Error(`Unknown credit pack: ${packId}`);

  const appUrl = resolveAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: pack.amountCents,
          product_data: { name: `GIVIT Credits -- ${pack.label} pack (${pack.credits} credits)` },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/account?credits_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/account?credits_purchase=cancelled`,
    metadata: { source: "givit_credit_pack", user_id: userId, pack_id: packId, credits: String(pack.credits) },
  });
  return session;
}

// Confirms a completed Checkout Session and grants the credits. Idempotent
// by design: grant_credits() only ever gets called once per
// payment_intent, because we check for an existing credit_transactions
// row with that stripe_payment_intent_id first -- so a user refreshing
// the success page, or the same session_id being confirmed twice for any
// reason, never double-grants. This confirm-on-return approach (rather
// than a webhook) matches how api/stripe/setup-intent.ts's charge flow
// already works in this codebase -- no webhook handler exists yet (see
// the note in credit-system-proposal.md); the known tradeoff is that a
// user who pays and closes the tab before hitting the success page won't
// get auto-granted until they revisit it. A real webhook handler would
// close that gap and is worth building once this pattern is validated.
export async function confirmCreditCheckoutSession(stripe, userId, sessionId, alreadyGrantedFn, grantFn) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.user_id !== userId) {
    throw new Error("This checkout session doesn't belong to you.");
  }
  if (session.payment_status !== "paid") {
    return { ok: false, status: session.payment_status };
  }
  const already = await alreadyGrantedFn(session.payment_intent);
  if (already) {
    return { ok: true, alreadyGranted: true };
  }
  const credits = Number(session.metadata?.credits || 0);
  if (!credits) throw new Error("Session is missing a credits amount.");
  const result = await grantFn(userId, credits, "pack_purchase", session.payment_intent);
  return { ok: true, alreadyGranted: false, balance: result.balance, creditsGranted: credits };
}
