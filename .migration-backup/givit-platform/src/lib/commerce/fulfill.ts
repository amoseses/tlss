import type { CheckoutQuote } from "@/lib/commerce/types";
import { formatShippingAddress } from "@/lib/commerce/checkout";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function fulfillCheckoutFromPaymentIntent(
  paymentIntentId: string,
): Promise<{ orderId: string; created: boolean }> {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment has not succeeded yet.");
  }

  const supabase = createServiceClient();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existingOrder?.id) {
    return { orderId: existingOrder.id as string, created: false };
  }

  const quoteId = paymentIntent.metadata.quote_id;
  const userId = paymentIntent.metadata.user_id;
  if (!quoteId || !userId) {
    throw new Error("PaymentIntent is missing checkout metadata.");
  }

  const { data: quoteRow, error: quoteError } = await supabase
    .from("checkout_quotes")
    .select("quote_json, user_id")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quoteRow) {
    throw new Error("Checkout quote not found for this payment.");
  }
  if (quoteRow.user_id !== userId) {
    throw new Error("Checkout quote does not match payment user.");
  }

  const quote = quoteRow.quote_json as CheckoutQuote;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      status: "pending",
      payment_status: "paid",
      subtotal_cents: quote.merchandiseCents,
      merchandise_cents: quote.merchandiseCents,
      shipping_cents: quote.shippingCents,
      tax_cents: quote.taxCents,
      platform_fee_cents: quote.platformFeeCents,
      total_cents: quote.totalCents,
      stripe_payment_intent_id: paymentIntentId,
      stripe_tax_calculation_id: quote.stripeTaxCalculationId,
      notes: quote.notes || null,
      shipping_company: quote.shipTo.company || null,
      shipping_address: formatShippingAddress(quote.shipTo),
      billing_company: quote.billingCompany || null,
      billing_address: quote.billingAddress || null,
      ship_to_name: quote.shipTo.name,
      ship_to_line1: quote.shipTo.line1,
      ship_to_line2: quote.shipTo.line2 || null,
      ship_to_city: quote.shipTo.city,
      ship_to_state: quote.shipTo.state,
      ship_to_zip: quote.shipTo.zip,
      ship_to_country: quote.shipTo.country,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw orderError ?? new Error("Could not create order.");
  }

  const orderId = order.id as string;

  for (const group of quote.sellerGroups) {
    const { data: sellerOrder, error: sellerOrderError } = await supabase
      .from("seller_orders")
      .insert({
        order_id: orderId,
        seller_id: group.sellerId,
        status: "pending",
        merchandise_cents: group.merchandiseCents,
        shipping_cents: group.shippingCents,
        tax_cents: group.taxCents,
        platform_fee_cents: group.platformFeeCents,
        seller_payout_cents: group.sellerPayoutCents,
        shipping_carrier: group.shippingCarrier,
        shipping_service: group.shippingService,
        shippo_shipment_id: group.shippoShipmentId,
        shippo_rate_id: group.shippoRateId,
      })
      .select("id")
      .single();

    if (sellerOrderError || !sellerOrder) {
      throw sellerOrderError ?? new Error("Could not create seller order.");
    }

    const sellerOrderId = sellerOrder.id as string;

    const itemRows = group.lines.map((line) => ({
      order_id: orderId,
      seller_order_id: sellerOrderId,
      seller_id: group.sellerId,
      product_id: line.productId,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      product_name: line.name,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
    if (itemsError) throw itemsError;

    const transfer = await stripe.transfers.create({
      amount: group.sellerPayoutCents,
      currency: "usd",
      destination: group.stripeConnectAccountId,
      transfer_group: paymentIntentId,
      metadata: {
        order_id: orderId,
        seller_order_id: sellerOrderId,
        seller_id: group.sellerId,
      },
    });

    await supabase
      .from("seller_orders")
      .update({ stripe_transfer_id: transfer.id })
      .eq("id", sellerOrderId);

    for (const line of group.lines) {
      const { data: product } = await supabase
        .from("products")
        .select("stock")
        .eq("id", line.productId)
        .single();

      if (product) {
        const nextStock = Math.max(0, (product.stock as number) - line.quantity);
        await supabase.from("products").update({ stock: nextStock }).eq("id", line.productId);
      }
    }
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cart?.id) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  await stripe.tax.transactions.createFromCalculation({
    calculation: quote.stripeTaxCalculationId,
    reference: orderId,
  });

  return { orderId, created: true };
}

export async function syncConnectAccount(accountId: string) {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const supabase = createServiceClient();

  await supabase
    .from("profiles")
    .update({
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
    })
    .eq("stripe_connect_account_id", accountId);
}
