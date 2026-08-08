import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

// Publishable key is safe client-side by design -- it can only create
// tokens/SetupIntents, never charge or read anything. The secret key that
// actually moves money lives only in api/_lib/stripe.mjs, server-side.
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!key) {
      console.warn("[stripe] VITE_STRIPE_PUBLISHABLE_KEY is not configured; payment setup will fail.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
