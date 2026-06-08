import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { Bell, CalendarCheck, CreditCard, Gift, HeartHandshake, MapPin, MessageSquare, PackageCheck, Sparkles, Truck, type LucideIcon } from "lucide-react";

export const SURVEY_LEAD_DAYS = 35;
export const DELIVERY_BUFFER_DAYS = 5;

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
  addressLabel: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryPreference: "ship" | "email" | "either";
};

export type ConciergeNotification = {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  scheduledFor: string;
  channel: "push" | "email" | "sms" | "in_app";
  status: "scheduled" | "sent" | "approved" | "skipped";
  kind: "survey" | "approval" | "order";
};

export type GiftBundleItem = {
  label: string;
  description: string;
  priceCents: number;
  type: "gift" | "card" | "flowers" | "experience" | "shipping" | "service";
  orderRoute: "marketplace" | "admin_task" | "affiliate_checkout" | "digital_delivery";
};

export type FulfillmentTask = {
  id: string;
  approvalId: string;
  itemLabel: string;
  route: GiftBundleItem["orderRoute"];
  status: "queued" | "ready_for_admin" | "ordered";
  details: string;
};

export type GiftApproval = {
  id: string;
  recipientId: string;
  status: "draft" | "needs_survey" | "needs_approval" | "approved" | "regenerating" | "ordered";
  headline: string;
  rationale: string;
  message: string;
  estimatedDelivery: string;
  surveyScheduledFor: string;
  surveyAnswers: string[];
  items: GiftBundleItem[];
  fulfillmentTasks: FulfillmentTask[];
};

export type ConciergeProfile = {
  automationEnabled: boolean;
  paymentStatus: "not_started" | "setup_pending" | "ready";
  addressStatus: "missing" | "ready";
  notificationChannels: Array<"push" | "email" | "sms">;
  paymentMethodLabel: string;
  defaultAddress: string;
};

export type ConciergeState = {
  profile: ConciergeProfile;
  recipients: ConciergeRecipient[];
  notifications: ConciergeNotification[];
  approvals: GiftApproval[];
};

export const CONCIERGE_STORAGE_KEY = "givit-concierge-state-v2";

export const DEFAULT_CONCIERGE_STATE: ConciergeState = {
  profile: {
    automationEnabled: false,
    paymentStatus: "not_started",
    addressStatus: "missing",
    notificationChannels: ["push", "email"],
    paymentMethodLabel: "",
    defaultAddress: "",
  },
  recipients: [],
  notifications: [],
  approvals: [],
};

export const CONCIERGE_STEPS: ConciergeStep[] = [
  {
    title: "Log in and start setup",
    description: "Anonymous visitors are prompted to sign in first so dates, addresses, approval history, and notification preferences can be saved to the account.",
    status: "done",
    icon: HeartHandshake,
  },
  {
    title: "Collect safe checkout defaults",
    description: "Ask for recipient addresses and a Stripe-saved payment method. Givit stores only tokenized payment details, never raw credit-card numbers.",
    status: "ready",
    icon: CreditCard,
  },
  {
    title: "Ask whether service is on",
    description: "The customer explicitly turns autopilot on or off. If it is off, Givit saves dates but will not schedule surveys, approvals, charges, or orders.",
    status: "ready",
    icon: Bell,
  },
  {
    title: "Send the Givit survey 5 weeks out",
    description: "Every occasion creates a survey notification exactly 35 days before the date, then uses answers to choose the best gift box: gift, card, flowers, tickets, or add-ons.",
    status: "waiting",
    icon: Sparkles,
  },
  {
    title: "Approve before ordering",
    description: "After approval, Givit creates fulfillment tasks for marketplace items, admin-purchased cards, florists, affiliate checkout providers, and digital delivery.",
    status: "blocked",
    icon: PackageCheck,
  },
];

export const AUTOMATION_RULES = [
  "Autopilot must be switched on before Givit schedules surveys or order work.",
  "Never charge until the user taps Approve on a generated bundle.",
  "Never store raw credit-card data; keep only Stripe customer/payment-method IDs and display labels.",
  "Schedule the Givit survey exactly 35 days before each occasion, with in-app fallback if push is unavailable.",
  "Always include delivery buffer days before the occasion.",
  "Route card-only and unsupported external purchases to the admin order queue instead of silently buying them.",
  "If the user rejects a bundle, preserve recipient details and regenerate with the stated reason.",
];

export function dateBeforeOccasion(occasionDate: string, days: number) {
  const target = subDays(parseISO(occasionDate), days);
  const today = new Date();
  return target < today ? today.toISOString().slice(0, 10) : target.toISOString().slice(0, 10);
}

export function deliveryDateForOccasion(occasionDate: string) {
  return dateBeforeOccasion(occasionDate, DELIVERY_BUFFER_DAYS);
}

export function getDaysUntil(date: string) {
  return differenceInCalendarDays(parseISO(date), new Date());
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

export function createFulfillmentTasks(approval: Pick<GiftApproval, "id" | "items">): FulfillmentTask[] {
  return approval.items.map((item, index) => ({
    id: `task-${approval.id}-${index}`,
    approvalId: approval.id,
    itemLabel: item.label,
    route: item.orderRoute,
    status: item.orderRoute === "admin_task" ? "ready_for_admin" : "queued",
    details: item.orderRoute === "admin_task"
      ? "Send this item to the admin order account for manual purchase or card writing."
      : "Provider adapter can place this order after approval using the saved Stripe/customer and delivery details.",
  }));
}

export function addDaysIso(date: string, days: number) {
  return addDays(parseISO(date), days).toISOString().slice(0, 10);
}
