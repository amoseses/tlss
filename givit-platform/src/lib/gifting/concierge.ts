import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Bell, CalendarCheck, CreditCard, Gift, HeartHandshake, MapPin, MessageSquare, PackageCheck, Sparkles, Truck, type LucideIcon } from "lucide-react";

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
};

export type GiftBundleItem = {
  label: string;
  description: string;
  priceCents: number;
  type: "gift" | "card" | "flowers" | "experience" | "shipping";
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
};

export type ConciergeProfile = {
  automationEnabled: boolean;
  paymentStatus: "not_started" | "setup_pending" | "ready";
  addressStatus: "missing" | "ready";
  notificationChannels: Array<"push" | "email" | "sms">;
};

export type ConciergeState = {
  profile: ConciergeProfile;
  recipients: ConciergeRecipient[];
  notifications: ConciergeNotification[];
  approvals: GiftApproval[];
};

export const CONCIERGE_STORAGE_KEY = "givit-concierge-state-v1";

const today = new Date();

function isoFromToday(days: number) {
  return addDays(today, days).toISOString().slice(0, 10);
}

export const DEFAULT_CONCIERGE_STATE: ConciergeState = {
  profile: {
    automationEnabled: true,
    paymentStatus: "setup_pending",
    addressStatus: "ready",
    notificationChannels: ["push", "email"],
  },
  recipients: [
    {
      id: "rec-mom",
      name: "Mom",
      relationship: "Parent",
      occasion: "Birthday",
      occasionDate: isoFromToday(18),
      budget: "$85",
      interests: "gardening, coffee, family photos, handmade keepsakes",
      avoid: "clutter, fragile glass",
      addressLabel: "Home address on file",
      deliveryPreference: "ship",
    },
    {
      id: "rec-friend",
      name: "Jordan",
      relationship: "Best friend",
      occasion: "Just because",
      occasionDate: isoFromToday(33),
      budget: "$120",
      interests: "basketball, live music, cozy food nights",
      avoid: "generic mugs",
      addressLabel: "Email delivery preferred",
      deliveryPreference: "either",
    },
  ],
  notifications: [
    {
      id: "notif-mom-1",
      recipientId: "rec-mom",
      title: "Approve Mom’s birthday gift",
      body: "Givit found a bundled gift, handwritten card, and flower option that can arrive with time to spare.",
      scheduledFor: isoFromToday(8),
      channel: "push",
      status: "scheduled",
    },
    {
      id: "notif-friend-1",
      recipientId: "rec-friend",
      title: "Quick questionnaire for Jordan",
      body: "Answer 4 questions and Givit will decide between a shipped gift or tickets/experience.",
      scheduledFor: isoFromToday(21),
      channel: "email",
      status: "scheduled",
    },
  ],
  approvals: [
    {
      id: "approval-mom",
      recipientId: "rec-mom",
      status: "needs_approval",
      headline: "Garden coffee care bundle + handwritten card",
      rationale: "Combines a useful gardening accessory, a premium coffee refill, seasonal flowers, and a warm card message based on her interests.",
      message: "Happy birthday, Mom — thank you for making every ordinary day feel cared for. I hope this gives you a quiet morning in the garden with coffee and flowers. Love you.",
      estimatedDelivery: isoFromToday(14),
      items: [
        { label: "Main gift", description: "Handmade ceramic garden marker set from a local seller", priceCents: 3400, type: "gift" },
        { label: "Add-on", description: "Fresh seasonal bouquet", priceCents: 2800, type: "flowers" },
        { label: "Card", description: "Handwritten note with premium stationery", priceCents: 700, type: "card" },
        { label: "Shipping", description: "Tracked shipping with delivery buffer", priceCents: 995, type: "shipping" },
      ],
    },
    {
      id: "approval-friend",
      recipientId: "rec-friend",
      status: "draft",
      headline: "Basketball night experience or cozy food kit",
      rationale: "Givit will ask one short preference question before deciding whether to send tickets digitally or ship a food-night bundle.",
      message: "Thinking of you — pick a night and let this turn into something fun.",
      estimatedDelivery: isoFromToday(30),
      items: [
        { label: "Experience", description: "Two local game tickets or concert credit", priceCents: 9500, type: "experience" },
        { label: "Card", description: "Digital or handwritten note", priceCents: 500, type: "card" },
      ],
    },
  ],
};

export const CONCIERGE_STEPS: ConciergeStep[] = [
  {
    title: "Create your gift autopilot",
    description: "Log in once, add your important people, dates, budget ranges, shipping defaults, and the safe approval rules Givit must follow.",
    status: "done",
    icon: HeartHandshake,
  },
  {
    title: "Collect payment safely",
    description: "Use Stripe SetupIntents to save a payment method token. Givit never stores raw card numbers; orders are only charged after approval.",
    status: "ready",
    icon: CreditCard,
  },
  {
    title: "Notify before the deadline",
    description: "Push, email, SMS, and in-app reminders are scheduled around shipping buffers, ticket delivery windows, and your desired approval lead time.",
    status: "ready",
    icon: Bell,
  },
  {
    title: "AI builds a complete bundle",
    description: "A short occasion questionnaire produces a main gift, handwritten card message, flowers or add-ons, tickets/experiences when relevant, and fulfillment plan.",
    status: "waiting",
    icon: Sparkles,
  },
  {
    title: "Approve, regenerate, or skip",
    description: "You receive one approval screen. Approve to charge through Stripe and route orders to sellers, affiliates, card writers, florists, shipping, or email delivery.",
    status: "blocked",
    icon: PackageCheck,
  },
];

export const AUTOMATION_RULES = [
  "Never charge until the user taps Approve.",
  "Never store raw credit-card data; keep only Stripe customer/payment-method IDs.",
  "Always include delivery buffer days before the occasion.",
  "For homemade seller items, verify seller handling time before recommending.",
  "If the bundle contains tickets, choose digital delivery and confirm transfer instructions.",
  "If the user rejects a bundle, preserve the occasion data and regenerate with the stated reason.",
];

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
