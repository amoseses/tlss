import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env/commerce";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }
  return stripeClient;
}
