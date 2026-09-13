import { restFetch } from "./supabase-rest.mjs";
import { getStripe } from "./stripe.mjs";

async function getStripeCustomerIdForUser(userId) {
  const rows = await restFetch(`profiles?id=eq.${userId}&select=stripe_customer_id`);
  return rows?.[0]?.stripe_customer_id ?? null;
}

// Reuses a previously created Stripe Customer for this user (stored on
// profiles.stripe_customer_id) instead of creating a new one on every
// setup, which would otherwise leave orphaned duplicate Customers in Stripe.
export async function getOrCreateStripeCustomer(userId, email) {
  const existing = await getStripeCustomerIdForUser(userId);
  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { user_id: userId, source: "givit_autogift" },
  });

  await restFetch(`profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ stripe_customer_id: customer.id }),
  });

  return customer.id;
}

// The client only ever gets back a payment_method ID from confirmSetup, not
// its card details -- Stripe.js deliberately doesn't expose that client-side.
// Retrieving it here (secret key, server-only) is how the onboarding wizard
// gets a real brand/last4 to display and store, instead of the last-4
// digits it used to compute itself from a raw, untokenized card number.
//
// userId is required so this can verify the payment method actually
// belongs to the caller -- Stripe payment_method IDs aren't guessable, but
// nothing else was checking ownership, so any signed-in user who obtained
// another user's pm_ id (e.g. leaked in a log or a bug elsewhere) could
// otherwise read that card's brand/last4 back.
export async function getPaymentMethodSummary(paymentMethodId, userId) {
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

  const ownCustomerId = await getStripeCustomerIdForUser(userId);
  if (!ownCustomerId || pm.customer !== ownCustomerId) {
    const notFound = new Error("Not found.");
    notFound.statusCode = 404;
    throw notFound;
  }

  return { brand: pm.card?.brand ?? "card", last4: pm.card?.last4 ?? "" };
}
