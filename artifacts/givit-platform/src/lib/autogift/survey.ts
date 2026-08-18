import { recommendGifts } from "@/lib/gift-recommend";
import { getAllMarketplaceProducts } from "@/lib/data/marketplace";

/**
 * AutoGift Survey + Suggestion Engine
 *
 * 35 days before an occasion, a gift survey is triggered.
 * Recipient fills out preferences → AI generates suggestions → user approves → order is placed.
 */

export type GiftSurvey = {
  id: string;
  recipientId: string;
  recipientName: string;
  occasion: string;
  occasionDate: string;
  status: "pending" | "sent" | "responded" | "approved" | "ordered" | "shipped" | "delivered";
  createdAt: string;
  sentAt?: string;
  respondedAt?: string;
};

export type SurveyResponse = {
  interests: string[];
  budget: number;
  avoidItems: string[];
  giftStyle: "practical" | "surprise" | "sentimental" | "experience";
  notes: string;
  // Structured personality/tone traits for the recipient (e.g. "adventurous",
  // "low-key") -- kept separate from free-text `notes` so both the local
  // scoring engine and the AI prompt can weight them as deliberate signal
  // rather than something that only shows up if a shopper happens to type it.
  personality: string[];
  // What's actually worked/missed before, in the recipient's own gifting
  // history -- the single highest-signal input for "don't repeat the thing
  // that flopped" and "more of what landed," which nothing else here captures.
  pastGiftFeedback: {
    loved: string;
    missed: string;
  };
};

export type GiftSuggestion = {
  id: string;
  name: string;
  price: number;
  reason: string;
  category: string;
  rating: number;
  imageUrl?: string;
  productUrl?: string;
  fulfillmentNotes?: string;
};

export type AutoGiftBundle = {
  id: string;
  title: string;
  description: string;
  items: GiftSuggestion[];
};

export type AutoGiftOrder = {
  id: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  occasion: string;
  items: AutoGiftOrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: "pending_approval" | "approved" | "charged" | "admin_fulfillment" | "ordered" | "shipped" | "delivered" | "cancelled";
  chargeMode: "saved_card_after_approval";
  chargeNote: string;
  shippingAddress: ShippingAddress;
  cardMessage: string;
  createdAt: string;
  adminNotes?: string;
  approvedAt?: string;
};

export type AutoGiftOrderItem = {
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  category: "card" | "flowers" | "gift" | "activity" | "addon";
  price: number;
  quantity: number;
  notes?: string;
};

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
};

// Base prices for add-on items
export const ADDON_PRICING = {
  card: 500,     // $5.00 for a handwritten card
  flowers: 2500, // $25.00 for flowers
  gift_wrap: 800, // $8.00 for gift wrap
  expedited: 1500, // $15.00 for expedited shipping
};

const SURVEY_KEY = "givit-autogift-surveys";
const ORDERS_KEY = "givit-autogift-orders";

export function sendGiftSurvey(recipientName: string, occasion: string, occasionDate: string): GiftSurvey {
  const surveys = getSurveys();
  const survey: GiftSurvey = {
    id: crypto.randomUUID(),
    recipientId: crypto.randomUUID(),
    recipientName,
    occasion,
    occasionDate,
    status: "sent",
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  };
  surveys.push(survey);
  saveSurveys(surveys);
  return survey;
}

export function getSurveys(): GiftSurvey[] {
  try {
    return JSON.parse(window.localStorage.getItem(SURVEY_KEY) ?? "[]");
  } catch { return []; }
}

function saveSurveys(surveys: GiftSurvey[]) {
  window.localStorage.setItem(SURVEY_KEY, JSON.stringify(surveys));
}

export function respondToSurvey(surveyId: string, response: SurveyResponse) {
  const surveys = getSurveys().map(s =>
    s.id === surveyId ? { ...s, status: "responded" as const, respondedAt: new Date().toISOString() } : s
  );
  saveSurveys(surveys);
  window.localStorage.setItem(`givit-survey-response-${surveyId}`, JSON.stringify(response));
  return response;
}

export function getSurveyResponse(surveyId: string): SurveyResponse | null {
  try {
    return JSON.parse(window.localStorage.getItem(`givit-survey-response-${surveyId}`) ?? "null");
  } catch { return null; }
}

export type SuggestionContext = {
  recipientName?: string;
  occasion?: string;
  excludeIds?: string[];
};

/**
 * Generate gift suggestions based on survey response and budget.
 *
 * Card/flower add-ons stay small and rule-based (they're deliberate,
 * occasion-driven choices, not "products"). The actual gift and activity
 * picks are pulled from the live marketplace catalog through the same
 * interest-scoring engine that already powers Marketplace and Givit AI
 * chat (see gift-recommend.ts) instead of a fixed ~20-item dictionary keyed
 * on 11 exact interest words -- that dictionary is why every AutoGift
 * bundle converged on the same handful of generic items ("At-Home
 * Experience Night", a default card) regardless of what the recipient
 * actually liked: most real interests (e.g. "hiking", "makeup", "golf")
 * simply had no entry.
 */
export function generateGiftSuggestions(response: SurveyResponse, context: SuggestionContext = {}): GiftSuggestion[] {
  const suggestions: GiftSuggestion[] = [];

  const occasionText = `${response.notes} ${response.giftStyle} ${response.interests.join(" ")} ${response.personality.join(" ")} ${response.pastGiftFeedback.loved} ${response.pastGiftFeedback.missed}`.toLowerCase();
  const shouldIncludeCard = response.giftStyle === "sentimental" || /birthday|anniversary|wedding|sympathy|condolence|graduation|mother|father|love|miss you|thank/.test(occasionText);
  const shouldIncludeFlowers = response.interests.includes("plants") || /flower|garden|plant|sympathy|condolence|romantic|anniversary|mother/.test(occasionText);

  if (shouldIncludeCard) {
    suggestions.push({
      id: `card-${crypto.randomUUID()}`,
      name: "Handwritten Card",
      price: ADDON_PRICING.card,
      reason: response.giftStyle === "sentimental"
        ? "A short, specific note tied to the occasion keeps the package personal."
        : "A card makes sense for this occasion and keeps the gift from feeling generic.",
      imageUrl: "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=600&q=80",
      productUrl: "https://www.papyrusonline.com/",
      category: "card",
      fulfillmentNotes: "User can specify card tone, message, and stationery style before approval.",
      rating: response.giftStyle === "sentimental" ? 95 : 86,
    });
  }

  if (shouldIncludeFlowers) {
    suggestions.push({
      id: `flowers-${crypto.randomUUID()}`,
      name: response.interests.includes("plants") ? "Living Plant Delivery" : "Fresh Flowers Delivery",
      price: ADDON_PRICING.flowers,
      imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80",
      productUrl: "https://www.1800flowers.com/",
      reason: response.interests.includes("plants")
        ? "A plant fits their interests better than default flowers and lasts longer."
        : "Flowers are included only because the occasion and tone make them feel appropriate.",
      category: "flowers",
      fulfillmentNotes: response.interests.includes("plants") ? "Ask for plant type, pet safety, pot color, and care level." : "Ask for flower type, colors, allergies, scent sensitivity, and no-go blooms.",
      rating: response.interests.includes("plants") ? 92 : 84,
    });
  }

  // Real, interest-driven gift and activity picks from the live catalog.
  // "Experiences"-category products (pottery classes, chef's table credit,
  // jazz nights, museum memberships, ...) fill the "activity" role instead
  // of a hardcoded 3-item pool, so the outing bundles vary by what the
  // recipient is actually into, not a coin flip between the same two ideas.
  const query = [
    context.recipientName ? `Recipient: ${context.recipientName}.` : "",
    context.occasion ? `Occasion: ${context.occasion}.` : "",
    response.interests.length > 0 ? `Interests: ${response.interests.join(", ")}.` : "",
    response.personality.length > 0 ? `Personality: ${response.personality.join(", ")}.` : "",
    `Style: ${response.giftStyle}.`,
    response.budget > 0 ? `Budget under $${response.budget}.` : "",
    response.avoidItems.length > 0 ? `Avoid: ${response.avoidItems.join(", ")}.` : "",
    response.pastGiftFeedback.loved ? `A past gift they loved: ${response.pastGiftFeedback.loved}.` : "",
    response.pastGiftFeedback.missed ? `A past gift that missed the mark: ${response.pastGiftFeedback.missed}.` : "",
    response.notes,
  ].filter(Boolean).join(" ");

  const { results } = recommendGifts(query, {}, 10, {
    catalog: getAllMarketplaceProducts(),
    excludeIds: context.excludeIds,
  });

  for (const result of results) {
    suggestions.push({
      id: `product-${result.id}`,
      name: result.name,
      price: result.sale_price_cents ?? result.price_cents,
      reason: result.match_reason,
      imageUrl: result.image_url ?? undefined,
      productUrl: `/products/${result.slug}`,
      category: result.category_slug === "experiences" ? "activity" : "gift",
      rating: result.gift_score?.total ?? 80,
      fulfillmentNotes: result.avoidance_warning ?? undefined,
    });
  }

  // Extremely sparse edge case (e.g. avoid terms that happen to rule out
  // the whole catalog) -- recommendGifts almost always returns something,
  // but the bundle builder should never be left with nothing to work with.
  if (suggestions.filter((item) => item.category === "gift" || item.category === "activity").length === 0) {
    suggestions.push({
      id: `general-${crypto.randomUUID()}`,
      name: "GIVIT Marketplace Gift Card",
      price: Math.max(2500, response.budget * 50),
      reason: "Let them choose exactly what they want from our curated marketplace.",
      category: "gift",
      rating: 80,
    });
  }

  return suggestions;
}

function dedupeItems(items: Array<GiftSuggestion | undefined>): GiftSuggestion[] {
  const seen = new Set<string>();
  const result: GiftSuggestion[] = [];
  for (const item of items) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function describeBundle(items: GiftSuggestion[]): string {
  const activityItem = items.find((item) => item.category === "activity");
  const giftItems = items.filter((item) => item.category === "gift");
  const parts: string[] = [];
  if (activityItem) parts.push(activityItem.name);
  parts.push(...giftItems.map((item) => item.name));
  if (parts.length === 0) return "A gift package tailored to their interests.";
  if (parts.length === 1) return `${parts[0]}, matched to their interests.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

// Derived from what actually made it into the bundle (post-dedupe) rather
// than a fixed label per slot -- a slot can lose its activity/flower to
// deduping or a thin catalog match, and a hardcoded title like "Two gifts"
// reading over a bundle that only ended up with one item looks broken.
function titleBundle(items: GiftSuggestion[]): string {
  const hasActivity = items.some((item) => item.category === "activity");
  const giftCount = items.filter((item) => item.category === "gift").length;
  const hasCard = items.some((item) => item.category === "card");
  const hasFlowers = items.some((item) => item.category === "flowers");
  if (hasActivity && giftCount > 0) return "Experience + gift";
  if (hasActivity) return "Experience";
  if (giftCount >= 2) return "Two gifts";
  if (giftCount === 1 && (hasCard || hasFlowers)) return "One gift + card";
  if (giftCount === 1) return "One strong gift";
  return "Gift package";
}

export function generateGiftBundles(response: SurveyResponse, count = 3, context: SuggestionContext = {}): AutoGiftBundle[] {
  const pool = generateGiftSuggestions(response, context);
  const gifts = pool.filter((item) => item.category === "gift");
  const activities = pool.filter((item) => item.category === "activity");
  const touches = pool.filter((item) => item.category === "card" || item.category === "flowers" || item.category === "addon");
  const firstGift = gifts[0] ?? pool.find((item) => item.category !== "card");
  const secondGift = gifts[1] ?? gifts[0] ?? firstGift;
  // The "single gift" bundle deliberately prefers a THIRD distinct gift,
  // not firstGift again -- when no activity product scores (common, since
  // the catalog's "experiences" category is thin), the first bundle
  // collapses to just [card, firstGift], which is exactly the same set of
  // items as this bundle if it also used firstGift. Falls back to
  // firstGift only when the pool genuinely has nothing else.
  const thirdGift = gifts[2] ?? gifts[1] ?? gifts[0] ?? firstGift;
  const activity = activities[0];
  const premiumActivity = activities[1] ?? activities[0];
  // Only include the paid "handwritten card" line item when the occasion
  // actually calls for one -- it used to fall back to a synthesized default
  // card and get forced into two of the three bundles regardless, which is
  // part of why every option looked the same.
  const card = touches.find((item) => item.category === "card");
  const flower = touches.find((item) => item.category === "flowers");

  const bundleDefs: Array<{ id: string; items: GiftSuggestion[] }> = [
    { id: `bundle-activity-${crypto.randomUUID()}`, items: dedupeItems([activity, card, firstGift]) },
    { id: `bundle-premium-${crypto.randomUUID()}`, items: dedupeItems([premiumActivity, secondGift, flower]) },
    { id: `bundle-single-${crypto.randomUUID()}`, items: dedupeItems([thirdGift ?? pool[0], card]) },
  ];

  // Belt-and-suspenders: a thin catalog match (few real interest hits) can
  // still leave two bundles with the exact same item set even after the
  // above. Detect it by comparing sorted item ids and swap in the next
  // pool gift the duplicate bundle doesn't already contain.
  const signature = (items: GiftSuggestion[]) => items.map((i) => i.id).sort().join("|");
  const seenSignatures = new Set<string>();
  for (const bundle of bundleDefs) {
    let sig = signature(bundle.items);
    if (seenSignatures.has(sig)) {
      const currentIds = new Set(bundle.items.map((i) => i.id));
      const replacement = gifts.find((g) => !currentIds.has(g.id));
      if (replacement) {
        bundle.items = dedupeItems([...bundle.items.filter((i) => i.category !== "gift"), replacement]);
        sig = signature(bundle.items);
      }
    }
    seenSignatures.add(sig);
  }

  return bundleDefs
    .filter((bundle) => bundle.items.length > 0)
    .slice(0, count)
    .map((bundle, index) => ({ ...bundle, title: `Option ${index + 1}: ${titleBundle(bundle.items)}`, description: describeBundle(bundle.items) }));
}

export function regenerateBundleItem(response: SurveyResponse, current: GiftSuggestion, offset = 0, context: SuggestionContext = {}): GiftSuggestion {
  // Real catalog items are id'd `product-<catalog id>` -- exclude the
  // current pick from the candidate pool so "regenerate" reliably swaps in
  // something different instead of re-scoring to the same top result.
  const excludeIds = current.id.startsWith("product-") ? [current.id.replace(/^product-/, "").replace(/-regen-.+$/, "")] : [];
  const pool = generateGiftSuggestions(
    { ...response, notes: `${response.notes} replace ${current.category} ${offset}` },
    { ...context, excludeIds: [...(context.excludeIds ?? []), ...excludeIds] },
  );
  const replacement = pool.find((item) => item.category === current.category && item.name !== current.name)
    ?? pool.find((item) => item.category === "gift" && item.name !== current.name)
    ?? pool[offset % pool.length]
    ?? current;
  return { ...replacement, id: `${replacement.id}-regen-${crypto.randomUUID()}` };
}

/**
 * Calculate AutoGift order total including all items, service fee, and add-ons
 */
export function calculateOrderTotal(items: AutoGiftOrderItem[]): { subtotal: number; serviceFee: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = Math.round(subtotal * 0.1); // 10% service fee
  return { subtotal, serviceFee, total: subtotal + serviceFee };
}

/**
 * Create an AutoGift order that goes to admin for fulfillment
 */
export function createAutoGiftOrder(params: {
  userId: string;
  recipientName: string;
  occasion: string;
  items: AutoGiftOrderItem[];
  shippingAddress: ShippingAddress;
  cardMessage: string;
}): AutoGiftOrder {
  const { subtotal, serviceFee, total } = calculateOrderTotal(params.items);

  const order: AutoGiftOrder = {
    id: `autogift-${crypto.randomUUID()}`,
    userId: params.userId,
    recipientId: crypto.randomUUID(),
    recipientName: params.recipientName,
    occasion: params.occasion,
    items: params.items,
    subtotal,
    serviceFee,
    total,
    status: "pending_approval",
    chargeMode: "saved_card_after_approval",
    chargeNote: "Customer must approve; then charge the saved card from AutoGift onboarding / first AutoGift checkout before admin fulfillment.",
    shippingAddress: params.shippingAddress,
    cardMessage: params.cardMessage,
    createdAt: new Date().toISOString(),
  };

  const orders = getAutoGiftOrders();
  orders.push(order);
  saveAutoGiftOrders(orders);

  return order;
}

export function getAutoGiftOrders(): AutoGiftOrder[] {
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "[]");
  } catch { return []; }
}

function saveAutoGiftOrders(orders: AutoGiftOrder[]) {
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function approveAutoGiftOrder(orderId: string) {
  const orders = getAutoGiftOrders().map(o =>
    o.id === orderId ? {
      ...o,
      status: "admin_fulfillment" as const,
      approvedAt: new Date().toISOString(),
      adminNotes: "Approved by customer. Charge saved card for the calculated total, then source/package items and ship to the saved recipient address.",
    } : o
  );
  saveAutoGiftOrders(orders);
}

export function cancelAutoGiftOrder(orderId: string) {
  const orders = getAutoGiftOrders().map(o =>
    o.id === orderId ? { ...o, status: "cancelled" as const } : o
  );
  saveAutoGiftOrders(orders);
}
