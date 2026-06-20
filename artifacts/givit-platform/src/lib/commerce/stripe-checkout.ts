import { getStripe } from "@/lib/stripe";
import { getStripePublishableKey } from "@/lib/env/commerce";
import type { ConciergeApproval, GiftBundleItem } from "@/lib/gifting/concierge";

/**
 * Creates a Stripe PaymentIntent for an auto-gift approval charge.
 * Uses the customer's saved payment method for off-session payment.
 */
export async function createGiftApprovalPaymentIntent(input: {
  approval: ConciergeApproval;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  metadata?: Record<string, string>;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string | null;
}> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: input.approval.total_cents,
    currency: "usd",
    customer: input.stripeCustomerId,
    payment_method: input.stripePaymentMethodId,
    off_session: true,
    confirm: true,
    description: `AutoGift: ${input.approval.headline}`,
    metadata: {
      approval_id: input.approval.id,
      recipient_id: input.approval.recipient_id,
      occasion_id: input.approval.occasion_id ?? "",
      ...input.metadata,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  };
}

/**
 * Creates a Stripe SetupIntent for saving a new payment method
 * for future auto-gift charges.
 */
export async function createGiftSetupIntent(input: {
  stripeCustomerId: string;
}): Promise<{
  clientSecret: string;
  setupIntentId: string;
}> {
  const stripe = getStripe();

  const setupIntent = await stripe.setupIntents.create({
    customer: input.stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      source: "givit_autogift_setup",
    },
  });

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Attaches a payment method to a customer and sets it as the default
 * for future auto-gift charges.
 */
export async function attachPaymentMethodToCustomer(input: {
  stripeCustomerId: string;
  paymentMethodId: string;
}): Promise<void> {
  const stripe = getStripe();

  await stripe.paymentMethods.attach(input.paymentMethodId, {
    customer: input.stripeCustomerId,
  });

  await stripe.customers.update(input.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: input.paymentMethodId,
    },
  });
}

/**
 * Creates or retrieves a Stripe Customer for a user.
 */
export async function getOrCreateStripeCustomer(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}): Promise<{ customerId: string }> {
  const stripe = getStripe();

  // Search for existing customer
  const customers = await stripe.customers.list({
    email: input.email ?? undefined,
    limit: 10,
  });

  const existing = customers.data.find(
    (c: { metadata?: Record<string, string> }) => c.metadata?.user_id === input.userId,
  );

  if (existing) {
    return { customerId: existing.id };
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    metadata: {
      user_id: input.userId,
      source: "givit_autogift",
    },
  });

  return { customerId: customer.id };
}

/**
 * Calculates the total for a gift bundle and creates a PaymentIntent
 * for the auto-gift checkout flow.
 */
export async function createBundleCheckout(input: {
  items: GiftBundleItem[];
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  approvalId: string;
  recipientId: string;
  occasionId?: string;
  headline: string;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string | null;
}> {
  const totalCents = input.items.reduce(
    (sum, item) => sum + item.price_cents,
    0,
  );

  const lineItems = input.items.map((item, index) => ({
    product_id: item.product_id ?? undefined,
    seller_id: item.seller_id ?? undefined,
    item_type: item.item_type,
    title: item.title,
    price_cents: item.price_cents,
  }));

  return createGiftApprovalPaymentIntent({
    approval: {
      id: input.approvalId,
      recipient_id: input.recipientId,
      occasion_id: input.occasionId ?? null,
      total_cents: totalCents,
      headline: input.headline,
      status: "needs_approval",
      rationale: null,
      card_message: null,
      stripe_payment_intent_id: null,
      estimated_delivery_date: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      gift_approval_items: lineItems.map((item, idx) => ({
        id: `item_${idx}`,
        item_type: item.item_type as GiftBundleItem["item_type"],
        title: item.title,
        description: "",
        price_cents: item.price_cents,
        external_url: null,
        fulfillment_status: "pending",
      })),
    },
    stripeCustomerId: input.stripeCustomerId,
    stripePaymentMethodId: input.stripePaymentMethodId,
    metadata: {
      bundle_item_count: String(input.items.length),
    },
  });
}

/**
 * Returns the Stripe publishable key for client-side usage.
 */
export function getClientStripeKey(): string {
  return getStripePublishableKey();
}