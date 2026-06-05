"use server";

import { revalidatePath } from "next/cache";

import {
  buildCheckoutQuote,
  loadSellerProfiles,
  loadValidatedCart,
} from "@/lib/commerce/checkout";
import { fulfillCheckoutFromPaymentIntent } from "@/lib/commerce/fulfill";
import type { CheckoutAddress } from "@/lib/commerce/types";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

function parseCheckoutAddress(input: {
  ship_to_name: string;
  shipping_company: string;
  ship_to_line1: string;
  ship_to_line2: string;
  ship_to_city: string;
  ship_to_state: string;
  ship_to_zip: string;
}): CheckoutAddress {
  const state = input.ship_to_state.trim().toUpperCase();
  const zip = input.ship_to_zip.trim();

  if (!input.ship_to_name.trim()) throw new Error("Recipient name is required.");
  if (!input.ship_to_line1.trim()) throw new Error("Street address is required.");
  if (!input.ship_to_city.trim()) throw new Error("City is required.");
  if (state.length !== 2) throw new Error("Use a two-letter state code.");
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new Error("Enter a valid US ZIP code.");

  return {
    name: input.ship_to_name.trim(),
    company: input.shipping_company.trim(),
    line1: input.ship_to_line1.trim(),
    line2: input.ship_to_line2.trim(),
    city: input.ship_to_city.trim(),
    state,
    zip,
    country: "US",
  };
}

export type CheckoutQuoteResponse = {
  quoteId: string;
  clientSecret: string;
  quote: {
    merchandiseCents: number;
    shippingCents: number;
    taxCents: number;
    platformFeeCents: number;
    totalCents: number;
    sellerGroups: {
      sellerName: string;
      merchandiseCents: number;
      shippingCents: number;
      taxCents: number;
      shippingCarrier: string;
      shippingService: string;
    }[];
  };
};

export async function prepareCheckoutAction(input: {
  ship_to_name: string;
  shipping_company: string;
  ship_to_line1: string;
  ship_to_line2: string;
  ship_to_city: string;
  ship_to_state: string;
  ship_to_zip: string;
  billing_company: string;
  billing_address: string;
  notes: string;
}): Promise<CheckoutQuoteResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const lines = await loadValidatedCart(supabase, user.id);
  if (lines.length === 0) throw new Error("Your cart is empty");

  const shipTo = parseCheckoutAddress(input);
  const sellerIds = [...new Set(lines.map((l) => l.product.seller_id!))];
  const sellerProfiles = await loadSellerProfiles(supabase, sellerIds);

  const quote = await buildCheckoutQuote({
    lines,
    shipTo,
    notes: input.notes.trim(),
    billingCompany: input.billing_company.trim(),
    billingAddress: input.billing_address.trim(),
    sellerProfiles,
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: quoteRow, error: quoteInsertError } = await supabase
    .from("checkout_quotes")
    .insert({
      user_id: user.id,
      cart_fingerprint: quote.cartFingerprint,
      quote_json: quote,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (quoteInsertError || !quoteRow) {
    throw quoteInsertError ?? new Error("Could not save checkout quote.");
  }

  const quoteId = quoteRow.id as string;
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: quote.totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      quote_id: quoteId,
      user_id: user.id,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Could not initialize payment.");
  }

  await supabase
    .from("checkout_quotes")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", quoteId);

  return {
    quoteId,
    clientSecret: paymentIntent.client_secret,
    quote: {
      merchandiseCents: quote.merchandiseCents,
      shippingCents: quote.shippingCents,
      taxCents: quote.taxCents,
      platformFeeCents: quote.platformFeeCents,
      totalCents: quote.totalCents,
      sellerGroups: quote.sellerGroups.map((g) => ({
        sellerName: g.sellerName,
        merchandiseCents: g.merchandiseCents,
        shippingCents: g.shippingCents,
        taxCents: g.taxCents,
        shippingCarrier: g.shippingCarrier,
        shippingService: g.shippingService,
      })),
    },
  };
}

export async function completeCheckoutAction(
  paymentIntentId: string,
): Promise<{ orderId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.metadata.user_id !== user.id) {
    throw new Error("This payment does not belong to your account.");
  }

  const result = await fulfillCheckoutFromPaymentIntent(paymentIntentId);

  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/admin/orders");

  return { orderId: result.orderId };
}

export async function getOrderIdForPaymentIntentAction(
  paymentIntentId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}
