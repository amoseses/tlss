import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

// Checked directly (not just inferred from a failed loadStripe call) so
// callers can show an immediate, specific error instead of leaving the
// payment form's loading spinner spinning forever with no explanation.
export function hasStripePublishableKey(): boolean {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim());
}

// Publishable key is safe client-side by design -- it can only create
// tokens/SetupIntents, never charge or read anything. The secret key that
// actually moves money lives only in api/_lib/stripe.mjs, server-side.
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!key) {
      console.error(
        "[stripe] VITE_STRIPE_PUBLISHABLE_KEY is not configured for this environment (set it in .env.local for " +
          "local dev, and in the deployment platform's project env vars for previews/production) -- payment setup will fail."
      );
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
