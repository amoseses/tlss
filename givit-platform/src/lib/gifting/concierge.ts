import { addYears, differenceInCalendarDays, format, isBefore, parseISO, subDays } from "date-fns";
import { Bell, CalendarCheck, CreditCard, Gift, HeartHandshake, MessageSquare, PackageCheck, Sparkles, Truck, type LucideIcon } from "lucide-react";

import { MARKETPLACE_PRODUCTS, type MarketplaceProduct } from "@/lib/data/marketplace";

export const SURVEY_LEAD_DAYS = 35;
export const DEFAULT_APPROVAL_LEAD_DAYS = 10;
export const DEFAULT_SHIPPING_BUFFER_DAYS = 5;
export const PLATFORM_FEE_CENTS = 995;
export const DEFAULT_SHIPPING_CENTS = 899;
export const DEFAULT_CARD_CENTS = 700;
export const DEFAULT_FLOWERS_CENTS = 2400;

export type ConciergeProfile = {
  gift_automation_enabled: boolean;
  concierge_onboarding_completed: boolean;
  stripe_customer_id: string | null;
  stripe_default_payment_method_id: string | null;
};

export type ConciergeRecipient = {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  default_budget_cents: number;
  interests: string[];
  avoid_terms: string[];
  notes: string | null;
  ship_to_name: string | null;
  ship_to_line1: string | null;
  ship_to_line2: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  ship_to_country: string;
  delivery_preference: "ship" | "email" | "either";
  automation_enabled: boolean;
  occasions?: ConciergeOccasion[];
};

export type ConciergeOccasion = {
  id: string;
  recipient_id: string;
  occasion: string;
  occasion_date: string;
  repeats_yearly: boolean;
  approval_lead_days: number;
  shipping_buffer_days: number;
  status: "active" | "paused" | "completed";
};

export type ConciergeNotification = {
  id: string;
  recipient_id: string | null;
  occasion_id: string | null;
  title: string;
  body: string;
  channel: "push" | "email" | "sms" | "in_app";
  scheduled_for: string;
  sent_at: string | null;
  status: "scheduled" | "sent" | "approved" | "skipped" | "failed";
  metadata: Record<string, unknown>;
};

export type GiftBundleItem = {
  item_type: "gift" | "card" | "flowers" | "experience" | "shipping" | "service";
  title: string;
  description: string;
  price_cents: number;
  external_url: string | null;
  product_id?: string | null;
  seller_id?: string | null;
  metadata?: Record<string, unknown>;
};

export type GiftBoxRecommendation = {
  headline: string;
  rationale: string;
  card_message: string;
  estimated_delivery_date: string;
  total_cents: number;
  items: GiftBundleItem[];
};

export type ConciergeApproval = {
  id: string;
  recipient_id: string;
  occasion_id: string | null;
  status: "draft" | "needs_approval" | "approved" | "paid_pending_fulfillment" | "ordered" | "shipped" | "delivered" | "regenerating" | "skipped" | "cancelled" | "payment_failed";
  headline: string;
  rationale: string | null;
  card_message: string | null;
  stripe_payment_intent_id: string | null;
  total_cents: number;
  estimated_delivery_date: string | null;
  approved_at: string | null;
  created_at: string;
  gift_approval_items?: Array<GiftBundleItem & { id: string; fulfillment_status: string }>;
};

export type ConciergeDashboardData = {
  profile: ConciergeProfile;
  recipients: ConciergeRecipient[];
  notifications: ConciergeNotification[];
  approvals: ConciergeApproval[];
  stripePublishableKey: string | null;
};

export type ConciergeAutomationConfig = {
  surveyLeadDays: number;
  approvalLeadDays: number;
  shippingBufferDays: number;
  allowExternalCheckoutAutomation: boolean;
};

export const CONCIERGE_AUTOMATION_CONFIG: ConciergeAutomationConfig = {
  surveyLeadDays: Number(process.env.NEXT_PUBLIC_GIFT_SURVEY_LEAD_DAYS ?? SURVEY_LEAD_DAYS),
  approvalLeadDays: Number(process.env.NEXT_PUBLIC_GIFT_APPROVAL_LEAD_DAYS ?? DEFAULT_APPROVAL_LEAD_DAYS),
  shippingBufferDays: Number(process.env.NEXT_PUBLIC_GIFT_SHIPPING_BUFFER_DAYS ?? DEFAULT_SHIPPING_BUFFER_DAYS),
  allowExternalCheckoutAutomation: process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT === "true",
};

export const CONCIERGE_STEPS = [
  { title: "Onboard dates and recipients", description: "Save recipients, addresses, occasions, and automation preferences in Supabase under the signed-in user's account.", status: "ready", icon: HeartHandshake },
  { title: "Tokenize payment", description: "Stripe Elements creates a SetupIntent so Givit stores only customer/payment-method IDs.", status: "ready", icon: CreditCard },
  { title: "Schedule five-week surveys", description: "Each active occasion receives an in-app survey notification exactly 35 days before the next occurrence.", status: "ready", icon: Bell },
  { title: "Generate AI gift box", description: "The survey expands catalog recommendations into a structured bundle with product, card, flowers/add-ons, shipping, and fee lines.", status: "ready", icon: Sparkles },
  { title: "Approve and fulfill", description: "Approval charges the saved Stripe method, marks the order Paid - Pending Fulfillment, and queues admin fulfillment tasks.", status: "ready", icon: PackageCheck },
];

export const AUTOMATION_RULES = [
  "Users can skip onboarding, but the profile dashboard keeps concierge setup editable.",
  "A global profile toggle and per-recipient toggle must both be on before automation sends due survey prompts.",
  "The Givit survey notification is scheduled exactly five weeks before the occasion date.",
  "Givit never stores raw card data and never charges until Approve and Order is clicked.",
  "All reads and writes are scoped by user_id and protected by Supabase RLS policies.",
];

export function nextOccurrenceDate(occasionDate: string, now = new Date()) {
  let date = parseISO(occasionDate);
  while (isBefore(date, now)) date = addYears(date, 1);
  return date.toISOString().slice(0, 10);
}

export function getSurveyDate(occasionDate: string) {
  return subDays(parseISO(nextOccurrenceDate(occasionDate)), CONCIERGE_AUTOMATION_CONFIG.surveyLeadDays).toISOString().slice(0, 10);
}

export function getApprovalDate(occasionDate: string, leadDays = CONCIERGE_AUTOMATION_CONFIG.approvalLeadDays) {
  return subDays(parseISO(nextOccurrenceDate(occasionDate)), leadDays).toISOString().slice(0, 10);
}

export function getEstimatedDeliveryDate(occasionDate: string, bufferDays = CONCIERGE_AUTOMATION_CONFIG.shippingBufferDays) {
  return subDays(parseISO(nextOccurrenceDate(occasionDate)), bufferDays).toISOString().slice(0, 10);
}

export function createAddressLabel(recipient: Pick<ConciergeRecipient, "ship_to_line1" | "ship_to_city" | "ship_to_state" | "ship_to_zip" | "ship_to_country">) {
  return [recipient.ship_to_line1, recipient.ship_to_city, recipient.ship_to_state, recipient.ship_to_zip, recipient.ship_to_country].filter(Boolean).join(", ");
}

export function getDaysUntil(date: string) {
  return differenceInCalendarDays(parseISO(date), new Date());
}

export function formatConciergeDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

export function getBundleTotal(items: Pick<GiftBundleItem, "price_cents">[]) {
  return items.reduce((total, item) => total + item.price_cents, 0);
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function iconForBundleItem(type: GiftBundleItem["item_type"]): LucideIcon {
  switch (type) {
    case "card": return MessageSquare;
    case "flowers": return HeartHandshake;
    case "experience": return CalendarCheck;
    case "shipping":
    case "service": return Truck;
    default: return Gift;
  }
}

function textTokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function productText(product: MarketplaceProduct) {
  return [product.name, product.brand, product.retailer, product.ai_summary, product.why_we_picked_it, ...product.interests, ...product.occasions, ...product.recipients].join(" ").toLowerCase();
}

export function recommendCatalogProduct(input: { relationship: string; occasion: string; interests: string[]; avoidTerms: string[]; budgetCents: number; salt?: string }) {
  const query = [input.relationship, input.occasion, ...input.interests, input.salt ?? ""].join(" ");
  const tokens = textTokens(query);
  const avoid = input.avoidTerms.map((term) => term.toLowerCase()).filter(Boolean);

  return [...MARKETPLACE_PRODUCTS]
    .map((product) => {
      const text = productText(product);
      const matchScore = tokens.filter((token) => text.includes(token)).length * 18;
      const budgetScore = product.price_cents <= input.budgetCents ? 30 : Math.max(-25, 30 - ((product.price_cents - input.budgetCents) / Math.max(input.budgetCents, 1)) * 50);
      const avoidPenalty = avoid.some((term) => text.includes(term)) ? 80 : 0;
      const saltScore = input.salt ? Math.abs((product.slug + input.salt).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 19) : 0;
      return { product, score: product.gift_match_score + matchScore + budgetScore + saltScore - avoidPenalty };
    })
    .sort((a, b) => b.score - a.score)[0]?.product ?? MARKETPLACE_PRODUCTS[0];
}

export function buildGiftBoxRecommendation(input: {
  recipientName?: string;
  relationship: string;
  occasion: string;
  occasionDate?: string;
  interests: string[];
  avoidTerms: string[];
  budgetCents: number;
  style?: string;
  surveyAnswers?: string;
  deliveryPreference?: "ship" | "email" | "either";
  regenerationNote?: string;
}): GiftBoxRecommendation {
  const combinedInterests = [...input.interests, ...(input.style ? [input.style] : []), ...(input.surveyAnswers ? textTokens(input.surveyAnswers) : [])];
  const wantsExperience = /ticket|concert|game|experience|event|show|travel/i.test(`${combinedInterests.join(" ")} ${input.surveyAnswers ?? ""}`);
  const wantsFlowers = /anniversary|romantic|mother|mom|flowers|bouquet|garden|birthday/i.test(`${input.relationship} ${input.occasion} ${combinedInterests.join(" ")}`);
  const product = recommendCatalogProduct({ ...input, interests: combinedInterests, salt: input.regenerationNote });
  const giftPrice = product.sale_price_cents ?? product.price_cents;
  const cappedGiftPrice = Math.min(giftPrice, Math.max(1500, input.budgetCents - DEFAULT_CARD_CENTS - DEFAULT_SHIPPING_CENTS - PLATFORM_FEE_CENTS));
  const occasionDate = input.occasionDate ?? new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const recipientLabel = input.recipientName?.trim() || "your recipient";

  const items: GiftBundleItem[] = wantsExperience
    ? [
        { item_type: "experience", title: `${input.occasion} experience or ticket credit`, description: `Admin queue will source an event or experience matching ${combinedInterests.slice(0, 4).join(", ") || "the survey"}.`, price_cents: Math.max(2500, Math.min(input.budgetCents - DEFAULT_CARD_CENTS - PLATFORM_FEE_CENTS, Math.round(input.budgetCents * 0.78))), external_url: null, metadata: { source: "admin_experience_queue" } },
        { item_type: "card", title: "Custom handwritten card", description: "Handwritten card routed to the card-writing queue.", price_cents: DEFAULT_CARD_CENTS, external_url: null },
        { item_type: "service", title: "Givit concierge fee", description: "Approval tracking, sourcing coordination, and fulfillment routing.", price_cents: PLATFORM_FEE_CENTS, external_url: null },
      ]
    : [
        { item_type: "gift", title: product.name, description: product.ai_summary, price_cents: cappedGiftPrice, external_url: product.affiliate_url, product_id: product.id, seller_id: product.seller_id, metadata: { retailer: product.retailer, brand: product.brand, source_url: product.affiliate_url } },
        { item_type: "card", title: "Custom handwritten card", description: "Handwritten card routed to the card-writing queue.", price_cents: DEFAULT_CARD_CENTS, external_url: null },
        { item_type: wantsFlowers ? "flowers" : "gift", title: wantsFlowers ? "Occasion bouquet" : "Curated gift-box add-on", description: wantsFlowers ? "Bouquet selected for the occasion, address, and delivery window." : "Small complementary add-on chosen by the fulfillment team.", price_cents: wantsFlowers ? DEFAULT_FLOWERS_CENTS : 1400, external_url: null, metadata: { source: wantsFlowers ? "florist_queue" : "admin_add_on_queue" } },
        { item_type: "shipping", title: "Estimated shipping", description: "Shipping budget based on delivery preference and date buffer.", price_cents: DEFAULT_SHIPPING_CENTS, external_url: null },
        { item_type: "service", title: "Givit concierge fee", description: "Approval tracking, sourcing coordination, and fulfillment routing.", price_cents: PLATFORM_FEE_CENTS, external_url: null },
      ];

  const total = getBundleTotal(items);
  return {
    headline: `${recipientLabel}'s ${input.occasion} gift box`,
    rationale: wantsExperience
      ? "The survey indicated an experience would be more memorable than a shipped object, so Givit will source tickets or a local event and pair it with a personal card."
      : `${product.name} is the strongest catalog match for ${input.relationship || "recipient"}, ${input.occasion}, and the stated interests while respecting the avoid list and budget.`,
    card_message: `Happy ${input.occasion}, ${recipientLabel}! I hope this brings a little joy and feels perfectly picked for you.`,
    estimated_delivery_date: getEstimatedDeliveryDate(occasionDate),
    total_cents: total,
    items,
  };
}
