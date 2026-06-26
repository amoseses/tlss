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

/**
 * Generate gift suggestions based on survey response and budget.
 * AI picks from marketplace products and adds cards/flowers/activities.
 */
export function generateGiftSuggestions(response: SurveyResponse): GiftSuggestion[] {
  const suggestions: GiftSuggestion[] = [];
  const remainingBudget = response.budget * 100; // convert to cents

  // Always add a card option
  suggestions.push({
    id: `card-${crypto.randomUUID()}`,
    name: "Handwritten Card",
    price: ADDON_PRICING.card,
    reason: response.giftStyle === "sentimental"
      ? "A short, specific note tied to the occasion keeps the package personal."
      : "A simple card keeps the gift from feeling like a blind shipment.",
    imageUrl: "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.papyrusonline.com/",
    category: "card",
    rating: response.giftStyle === "sentimental" ? 95 : 85,
  });

  // Always add flowers option
  suggestions.push({
    id: `flowers-${crypto.randomUUID()}`,
    name: "Fresh Flowers Delivery",
    price: ADDON_PRICING.flowers,
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.1800flowers.com/",
    reason: response.interests.includes("plants") || response.giftStyle === "sentimental"
      ? "Fresh flowers that match their style — perfect for any occasion."
      : "A classic way to brighten their day.",
    category: "flowers",
    rating: response.interests.includes("plants") ? 92 : 78,
  });

  // Activity suggestions based on gift style
  if (response.giftStyle === "experience" || response.budget >= 75) {
    suggestions.push({
      id: `activity-${crypto.randomUUID()}`,
      name: "Movie Night Box",
      price: 3000,
      imageUrl: "https://images.unsplash.com/photo-1521967906867-14ec9d64bee8?auto=format&fit=crop&w=600&q=80",
      productUrl: "https://www.uncommongoods.com/",
      reason: "A cozy movie night kit with gourmet popcorn, candy, and a streaming gift card.",
      category: "activity",
      rating: 84,
    });
    suggestions.push({
      id: `activity2-${crypto.randomUUID()}`,
      name: "Local Experience Credit",
      price: 5000,
      imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
      productUrl: "https://www.airbnb.com/experiences",
      reason: "Credit toward a local cooking class, pottery session, or wine tasting — arranged by our concierge.",
      category: "activity",
      rating: 88,
    });
  }

  // Product suggestions based on interests
  const INTEREST_MAP: Record<string, { name: string; price: number; url?: string; image?: string; reason?: string }[]> = {
    tech: [
      { name: "Anker 737 Power Bank", price: 14999, url: "https://www.anker.com/", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=600&q=80" },
      { name: "Tile Mate Tracker", price: 2499, url: "https://www.tile.com/", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" },
    ],
    reading: [
      { name: "Kindle Paperwhite", price: 15999, url: "https://www.amazon.com/kindle", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80" },
      { name: "Bookshop.org Gift Card", price: 5000, url: "https://bookshop.org/gift_cards", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80" },
    ],
    cooking: [
      { name: "AeroPress Coffee Maker", price: 4995, url: "https://aeropress.com/", image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80" },
      { name: "OXO Cold Brew Maker", price: 5199, url: "https://www.oxo.com/", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80" },
    ],
    fitness: [
      { name: "Stanley Quencher Tumbler", price: 4500, url: "https://www.stanley1913.com/", image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80" },
      { name: "Theragun Mini", price: 19900, url: "https://www.therabody.com/", image: "https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&w=600&q=80" },
    ],
    music: [
      { name: "Sony WH-1000XM5 Headphones", price: 39800 },
      { name: "MasterClass Membership", price: 12000 },
    ],
    coffee: [
      { name: "Ember Temperature Mug", price: 12995 },
      { name: "Fellow Stagg EKG Kettle", price: 16500 },
    ],
    gaming: [
      { name: "Nintendo Switch OLED", price: 34999 },
      { name: "8BitDo Ultimate Controller", price: 6999 },
    ],
    travel: [
      { name: "Patagonia Black Hole Duffel", price: 15900 },
      { name: "Apple AirTag 4 Pack", price: 9900 },
    ],
    plants: [
      { name: "Easy-Care Plant Delivery", price: 4500 },
      { name: "Ceramic Planter Set", price: 3800 },
    ],
    art: [
      { name: "Local Pottery Class Credit", price: 6500 },
      { name: "Premium Sketchbook + Pens", price: 4200 },
    ],
    pets: [
      { name: "Custom Pet Portrait", price: 8500 },
      { name: "Pet-and-Owner Movie Night Kit", price: 3900 },
    ],
  };

  for (const interest of response.interests) {
    const matches = INTEREST_MAP[interest.toLowerCase()] ?? [];
    for (const match of matches) {
      const totalWithFees = match.price + ADDON_PRICING.card + ADDON_PRICING.flowers;
      if (totalWithFees <= remainingBudget || suggestions.length < 3) {
        suggestions.push({
          id: `product-${interest}-${suggestions.length}`,
          name: match.name,
          price: match.price,
          reason: match.reason || `Matches their interest in ${interest} without needing extra explanation.`,
          imageUrl: match.image,
          productUrl: match.url,
          category: "gift",
          rating: Math.max(70, 92 - suggestions.length * 3),
        });
      }
    }
  }

  const hasActivity = suggestions.some((s) => s.category === "activity");
  if (!hasActivity && suggestions.length < 6) {
    suggestions.push({
      id: `activity-variety-${crypto.randomUUID()}`,
      name: "At-Home Experience Night",
      price: 4000,
      imageUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80",
      productUrl: "https://www.uncommongoods.com/",
      reason: "A flexible activity package such as movie night, game night, craft night, or a local outing credit chosen by the AI concierge.",
      category: "activity",
      rating: 82,
    });
  }

  // If nothing matched, add general options
  if (suggestions.length < 3) {
    suggestions.push({
      id: `general-${crypto.randomUUID()}`,
      name: "Givit Marketplace Gift Card",
      price: Math.max(2500, response.budget * 50),
      reason: "Let them choose exactly what they want from our curated marketplace.",
      category: "gift",
      rating: 80,
    });
  }

  return suggestions.slice(0, 10); // enough options for a paged bundle review
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
