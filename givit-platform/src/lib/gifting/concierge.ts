import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { Bell, CalendarCheck, CreditCard, Gift, HeartHandshake, MapPin, MessageSquare, PackageCheck, Sparkles, Truck, type LucideIcon } from "lucide-react";

export const SURVEY_LEAD_DAYS = 35;
export const DEFAULT_APPROVAL_LEAD_DAYS = 10;
export const DEFAULT_SHIPPING_BUFFER_DAYS = 5;

export type ConciergeStepStatus = "ready" | "waiting" | "blocked" | "done";

export type ConciergeStep = {
  title: string;
  description: string;
  status: ConciergeStepStatus;
  icon: LucideIcon;
};

export type ConciergeRecipient = {
  id: string;
  name: string;
  relationship: string;
  occasion: string;
  occasionDate: string;
  budget: string;
  interests: string;
  avoid: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressLabel: string;
  deliveryPreference: "ship" | "email" | "either";
  surveyStatus: "scheduled" | "sent" | "completed";
};

export type ConciergeNotification = {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  scheduledFor: string;
  channel: "push" | "email" | "sms" | "in_app";
  status: "scheduled" | "sent" | "approved" | "skipped";
  kind: "survey" | "approval" | "fulfillment";
};

export type GiftBundleItem = {
  label: string;
  description: string;
  priceCents: number;
  type: "gift" | "card" | "flowers" | "experience" | "shipping" | "service";
};

export type GiftApproval = {
  id: string;
  recipientId: string;
  status: "draft" | "needs_approval" | "approved" | "regenerating" | "ordered";
  headline: string;
  rationale: string;
  message: string;
  estimatedDelivery: string;
  items: GiftBundleItem[];
  fulfillmentTasks: string[];
};

export type ConciergeProfile = {
  automationEnabled: boolean;
  paymentStatus: "not_started" | "setup_pending" | "ready";
  addressStatus: "missing" | "ready";
  notificationChannels: Array<"push" | "email" | "sms">;
  stripePaymentMethodId: string;
  serviceConfirmed: boolean;
};

export type ConciergeState = {
  profile: ConciergeProfile;
  recipients: ConciergeRecipient[];
  notifications: ConciergeNotification[];
  approvals: GiftApproval[];
};

export type ConciergeAutomationConfig = {
  surveyLeadDays: number;
  approvalLeadDays: number;
  shippingBufferDays: number;
  allowExternalCheckoutAutomation: boolean;
  providers: {
    payment: "stripe";
    shipping: "shippo" | "manual";
    notifications: "web_push" | "manual";
    cards: "admin_queue" | "provider";
    flowers: "admin_queue" | "provider";
    externalCheckout: "admin_queue" | "browser_agent";
  };
};

export const CONCIERGE_STORAGE_KEY = "givit-concierge-state-v2";

const today = new Date();

export const CONCIERGE_AUTOMATION_CONFIG: ConciergeAutomationConfig = {
  surveyLeadDays: Number(process.env.NEXT_PUBLIC_GIFT_SURVEY_LEAD_DAYS ?? SURVEY_LEAD_DAYS),
  approvalLeadDays: Number(process.env.NEXT_PUBLIC_GIFT_APPROVAL_LEAD_DAYS ?? DEFAULT_APPROVAL_LEAD_DAYS),
  shippingBufferDays: Number(process.env.NEXT_PUBLIC_GIFT_SHIPPING_BUFFER_DAYS ?? DEFAULT_SHIPPING_BUFFER_DAYS),
  allowExternalCheckoutAutomation: process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT === "true",
  providers: {
    payment: "stripe",
    shipping: process.env.NEXT_PUBLIC_SHIPPO_ENABLED === "true" ? "shippo" : "manual",
    notifications: process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ? "web_push" : "manual",
    cards: "admin_queue",
    flowers: process.env.NEXT_PUBLIC_FLORIST_PROVIDER_ENABLED === "true" ? "provider" : "admin_queue",
    externalCheckout: process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT === "true" ? "browser_agent" : "admin_queue",
  },
};

export const DEFAULT_CONCIERGE_STATE: ConciergeState = {
  profile: {
    automationEnabled: false,
    paymentStatus: "not_started",
    addressStatus: "missing",
    notificationChannels: ["push", "email"],
    stripePaymentMethodId: "",
    serviceConfirmed: false,
  },
  recipients: [],
  notifications: [],
  approvals: [],
};

export const CONCIERGE_STEPS: ConciergeStep[] = [
  {
    title: "Log in and turn on service",
    description: "The site opens with a login prompt, then sends the customer into notification setup so saved dates, addresses, and payment tokens are tied to their account.",
    status: "ready",
    icon: HeartHandshake,
  },
  {
    title: "Collect payment safely",
    description: "Use Stripe SetupIntents to save a payment method token. Givit never stores raw credit-card numbers; orders are only charged after approval.",
    status: "ready",
    icon: CreditCard,
  },
  {
    title: "Schedule the Givit survey",
    description: `Each occasion gets a survey notification ${SURVEY_LEAD_DAYS} days before the date so the AI can ask timely preference questions.`,
    status: "ready",
    icon: Bell,
  },
  {
    title: "AI builds a complete gift box",
    description: "Survey answers become a full bundle: main gift, handwritten card, flowers or add-ons, shipping, or tickets/experiences when that is the best fit.",
    status: "waiting",
    icon: Sparkles,
  },
  {
    title: "Approve, order, and route fulfillment",
    description: "Approval charges through Stripe and creates fulfillment work for seller orders, external checkout/admin queue, card writing, florists, tickets, and shipping.",
    status: "blocked",
    icon: PackageCheck,
  },
];

export const AUTOMATION_RULES = [
  "Prompt for login before notification setup so saved gifting data belongs to an authenticated customer.",
  "Ask whether the customer wants the service on before scheduling surveys or fulfillment.",
  "Schedule the Givit survey five weeks before the occasion date.",
  "Never charge until the user taps Approve.",
  "Never store raw credit-card data; keep only Stripe customer/payment-method IDs.",
  "When direct external checkout automation is disabled, route cards, flowers, and outside-site purchases to the admin order queue.",
];

export function getSurveyDate(occasionDate: string) {
  return subDays(parseISO(occasionDate), CONCIERGE_AUTOMATION_CONFIG.surveyLeadDays).toISOString().slice(0, 10);
}

export function getApprovalDate(occasionDate: string) {
  return subDays(parseISO(occasionDate), CONCIERGE_AUTOMATION_CONFIG.approvalLeadDays).toISOString().slice(0, 10);
}

export function getEstimatedDeliveryDate(occasionDate: string) {
  return subDays(parseISO(occasionDate), CONCIERGE_AUTOMATION_CONFIG.shippingBufferDays).toISOString().slice(0, 10);
}

export function createAddressLabel(recipient: Pick<ConciergeRecipient, "addressLine1" | "city" | "state" | "postalCode" | "country">) {
  return [recipient.addressLine1, recipient.city, recipient.state, recipient.postalCode, recipient.country].filter(Boolean).join(", ");
}

export function getDaysUntil(date: string) {
  return differenceInCalendarDays(parseISO(date), today);
}

export function formatConciergeDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

export function getBundleTotal(items: GiftBundleItem[]) {
  return items.reduce((total, item) => total + item.priceCents, 0);
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function iconForBundleItem(type: GiftBundleItem["type"]): LucideIcon {
  switch (type) {
    case "card":
      return MessageSquare;
    case "flowers":
      return HeartHandshake;
    case "experience":
      return CalendarCheck;
    case "shipping":
    case "service":
      return Truck;
    default:
      return Gift;
  }
}

export function deliveryIcon(preference: ConciergeRecipient["deliveryPreference"]): LucideIcon {
  if (preference === "email") return CalendarCheck;
  if (preference === "either") return PackageCheck;
  return MapPin;
}

export function addDaysIso(date: string, days: number) {
  return addDays(parseISO(date), days).toISOString().slice(0, 10);
}
