import Stripe from "stripe";

let stripeClient;

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
