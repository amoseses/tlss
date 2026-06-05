import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { fulfillCheckoutFromPaymentIntent, syncConnectAccount } from "@/lib/commerce/fulfill";
import { getStripeWebhookSecret } from "@/lib/env/commerce";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await fulfillCheckoutFromPaymentIntent(paymentIntent.id);
        break;
      }
      case "account.updated": {
        const account = event.data.object;
        if (account.id) {
          await syncConnectAccount(account.id);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
