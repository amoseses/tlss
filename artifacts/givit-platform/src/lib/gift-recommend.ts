import { getAllMarketplaceProducts, MARKETPLACE_RATINGS, type MarketplaceProduct } from "@/lib/data/marketplace";
import { resolveProductImageSrc } from "@/lib/product-photo";

const TAG_MAP: Record<string, string[]> = {
  mom: ["parent", "home", "self care", "kitchen", "reading", "plants"],
  mother: ["parent", "home", "self care", "kitchen", "reading", "plants"],
  dad: ["parent", "tools", "outdoor", "tech", "sports", "coffee"],
  father: ["parent", "tools", "outdoor", "tech", "sports", "coffee"],
  friend: ["friend", "fun", "unique", "lifestyle", "creative"],
  partner: ["partner", "romantic", "home", "self care", "travel"],
  husband: ["partner", "tech", "outdoor", "fitness", "gaming"],
  wife: ["partner", "beauty", "home", "self care", "reading"],
  kid: ["kid", "toys", "creative", "gaming", "art"],
  child: ["kid", "toys", "creative", "gaming", "art"],
  coworker: ["coworker", "desk setup", "coffee", "office", "neutral"],
  teacher: ["teacher", "pens", "school", "coffee", "writing"],
  student: ["student", "school", "writing", "tech", "travel"],
  writer: ["writer", "writing", "journaling", "pens"],
  artist: ["artist", "art", "drawing", "creative"],
  traveler: ["traveler", "travel", "tech", "organization"],
  gamer: ["gamer", "gaming", "tech", "entertainment"],
  boss: ["professional", "office", "coffee", "neutral"],
  grandma: ["home", "comfort", "reading", "family", "kitchen", "plants"],
  grandpa: ["home", "comfort", "reading", "family", "outdoor", "tools"],
  sister: ["friend", "beauty", "self care", "creative", "lifestyle"],
  brother: ["friend", "gaming", "tech", "fitness", "outdoor"],
  girlfriend: ["partner", "romantic", "beauty", "self care", "keepsake"],
  boyfriend: ["partner", "tech", "outdoor", "fitness", "gaming"],
  fiancee: ["partner", "romantic", "keepsake", "beauty", "home"],
  fiance: ["partner", "romantic", "keepsake", "tech", "outdoor"],
  roommate: ["friend", "home", "kitchen", "neutral", "fun"],
  "best friend": ["friend", "fun", "unique", "lifestyle", "keepsake"],
  aunt: ["family", "home", "self care", "reading", "keepsake"],
  uncle: ["family", "tools", "outdoor", "tech", "coffee"],
  cousin: ["friend", "fun", "unique", "lifestyle", "creative"],
  niece: ["kid", "toys", "creative", "gaming", "art"],
  nephew: ["kid", "toys", "creative", "gaming", "art"],
  daughter: ["kid", "creative", "art", "reading", "keepsake"],
  son: ["kid", "gaming", "tech", "outdoor", "creative"],
  "mother-in-law": ["parent", "home", "self care", "kitchen", "keepsake"],
  "mother in law": ["parent", "home", "self care", "kitchen", "keepsake"],
  "father-in-law": ["parent", "tools", "outdoor", "tech", "coffee"],
  "father in law": ["parent", "tools", "outdoor", "tech", "coffee"],
  stepmom: ["parent", "home", "self care", "kitchen", "reading"],
  stepdad: ["parent", "tools", "outdoor", "tech", "coffee"],
  godmother: ["family", "keepsake", "self care", "reading", "home"],
  godfather: ["family", "keepsake", "tools", "outdoor", "coffee"],
  mentor: ["professional", "office", "coffee", "keepsake", "reading"],
  neighbor: ["neutral", "home", "kitchen", "fun", "lifestyle"],
  cooking: ["kitchen", "food", "dessert", "cooking"],
  gardening: ["garden", "plants", "outdoor", "nature"],
  fitness: ["fitness", "wellness", "running", "hydration"],
  tech: ["tech", "gadgets", "electronics"],
  reading: ["reading", "books", "cozy"],
  art: ["art", "creative", "drawing", "crafts"],
  music: ["music", "audio", "entertainment"],
  travel: ["travel", "adventure", "outdoor"],
  gaming: ["gaming", "entertainment", "tech"],
  coffee: ["coffee", "kitchen", "desk setup"],
  beauty: ["beauty", "self care", "skincare"],
  pens: ["pens", "writing", "journaling", "office", "school"],
  birthday: ["birthday", "giftable", "fun"],
  anniversary: ["anniversary", "romantic", "keepsake"],
  christmas: ["christmas", "holiday", "cozy"],
  graduation: ["graduation", "milestone", "school", "professional"],
  wedding: ["wedding", "home", "romantic"],
  housewarming: ["home", "kitchen", "plants", "design"],
  sentimental: ["keepsake", "romantic", "family"],
  practical: ["useful", "office", "home", "travel"],
  luxury: ["premium", "self care", "design"],
  unique: ["unique", "novelty", "creative"],
  cozy: ["cozy", "home", "comfort", "reading"],
  experience: ["experience", "memories", "date night", "local"],
  "new baby": ["baby", "family", "keepsake", "home"],
  "baby shower": ["baby", "family", "keepsake", "home"],
  retirement: ["milestone", "keepsake", "self care", "hobby"],
  promotion: ["professional", "office", "milestone", "keepsake"],
  "new job": ["professional", "office", "desk setup", "milestone"],
  sympathy: ["keepsake", "comfort", "plants", "cozy"],
  condolence: ["keepsake", "comfort", "plants", "cozy"],
  "get well": ["comfort", "cozy", "self care", "reading"],
  "thank you": ["keepsake", "unique", "cozy", "giftable"],
  congratulations: ["milestone", "giftable", "keepsake", "fun"],
  engagement: ["romantic", "keepsake", "home", "milestone"],
  valentine: ["romantic", "keepsake", "self care", "date night"],
  "mother's day": ["parent", "home", "self care", "keepsake"],
  "mothers day": ["parent", "home", "self care", "keepsake"],
  "father's day": ["parent", "tools", "outdoor", "keepsake"],
  "fathers day": ["parent", "tools", "outdoor", "keepsake"],
  easter: ["family", "fun", "cozy", "giftable"],
  halloween: ["fun", "unique", "giftable", "creative"],
  "new year": ["milestone", "fun", "self care", "giftable"],
};

export type LearningProfile = {
  productWeights?: Record<string, number>;
  tagWeights?: Record<string, number>;
};

export type GiftScore = {
  total: number;
  factors: {
    interests: number;
    uniqueness: number;
    priceFit: number;
    quality: number;
    reviewSentiment: number;
    novelty: number;
    previousOverlap: number;
  };
};

export type GiftRecommendResult = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  sale_price_cents?: number | null;
  description: string | null;
  image_url: string | null;
  avg_rating: number | null;
  review_count: number;
  match_reason: string;
  avoidance_warning?: string | null;
  gift_tags: string[];
  rank_label?: string;
  learning_tags?: string[];
  gift_score?: GiftScore;
};

export type GiftRecommendResponse = {
  message: string;
  results: GiftRecommendResult[];
  needsFollowUp?: boolean;
  tags: string[];
  budget: number | null;
};

type ParsedContext = {
  recipient: string | null;
  occasion: string | null;
  budget: number | null;
  interests: string[];
  avoid: string[];
};

function extractTags(query: string) {
  const lower = query.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, mappedTags] of Object.entries(TAG_MAP)) {
    if (lower.includes(keyword)) mappedTags.forEach((tag) => tags.add(tag));
  }
  return Array.from(tags);
}

function extractBudget(query: string) {
  const patterns = [
    /\$(\d+)/g,
    /(\d+)\s*(?:dollars?|bucks?)/gi,
    /(?:under|below|max|maximum|up to|budget(?:\s+of)?)\s*\$?(\d+)/gi,
    /(\d+)\s*-\s*\$?(\d+)/g,
  ];
  const found: number[] = [];
  for (const pattern of patterns) {
    for (const match of query.matchAll(pattern)) {
      const amount = Number.parseInt(match[2] ?? match[1] ?? "", 10);
      if (!Number.isNaN(amount) && amount > 0 && amount < 10000) found.push(amount);
    }
  }
  return found.length > 0 ? Math.max(...found) : null;
}

function extractAvoidTerms(query: string) {
  const lower = query.toLowerCase();
  const avoidMatch = lower.match(/(?:avoid|no|not|dont|don\'t|without)[:\s]+([^.;]+)/);
  if (!avoidMatch) return [];
  return avoidMatch[1].split(/,| and | or |\//).map((term) => term.trim()).filter((term) => term.length > 2);
}

function parseContext(query: string): ParsedContext {
  const lower = query.toLowerCase();
  const recipientMatch = query.match(/(?:recipient|for my|for a|shopping for|gift for)\s+([^,.;]+)/i);
  const OCCASION_WORDS = "birthday|anniversary|christmas|graduation|wedding|holiday|housewarming|thank you|valentine|new baby|baby shower|retirement|promotion|new job|sympathy|condolence|get well|congratulations|engagement|mother's day|mothers day|father's day|fathers day|easter|halloween|new year";
  const occasionMatch = query.match(new RegExp(`(?:occasion|for (?:a|their|his|her))\\s*(${OCCASION_WORDS})`, "i"))
    ?? lower.match(new RegExp(`\\b(${OCCASION_WORDS})\\b`));
  const interestMatch = query.match(/(?:interests?|likes?|loves?|into)\s*[:\s]+([^.;]+)/i);

  const recipientKeywords = [
    "mom", "mother", "dad", "father", "partner", "friend", "boss", "teacher", "student", "wife", "husband",
    "sister", "brother", "grandma", "grandpa", "coworker", "girlfriend", "boyfriend", "fiancee", "fiance",
    "roommate", "best friend", "aunt", "uncle", "cousin", "niece", "nephew", "daughter", "son",
    "mother-in-law", "mother in law", "father-in-law", "father in law", "stepmom", "stepdad",
    "godmother", "godfather", "mentor", "neighbor",
  ];
  const recipientFromKeyword = recipientKeywords.find((k) => lower.includes(k));

  return {
    recipient: recipientMatch?.[1]?.trim() ?? recipientFromKeyword ?? null,
    occasion: occasionMatch?.[1] ?? null,
    budget: extractBudget(query),
    interests: interestMatch?.[1]?.split(/,| and /).map((s) => s.trim()).filter(Boolean) ?? [],
    avoid: extractAvoidTerms(query),
  };
}

function isGreeting(query: string) {
  return /^(hi|hello|hey|howdy|good morning|good afternoon|yo)\b/i.test(query.trim());
}

function isHelpQuery(query: string) {
  return /\b(help|how does|what can you|what do you)\b/i.test(query);
}

function missingContext(ctx: ParsedContext) {
  const missing: string[] = [];
  if (!ctx.recipient) missing.push("recipient");
  if (!ctx.occasion) missing.push("occasion");
  if (!ctx.budget) missing.push("budget");
  if (ctx.interests.length === 0) missing.push("interests");
  return missing;
}

function productTokens(product: MarketplaceProduct) {
  return [
    product.name,
    product.brand,
    product.retailer,
    product.category?.name,
    product.ai_summary,
    product.why_we_picked_it,
    ...product.interests,
    ...product.occasions,
    ...product.recipients,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function giftScoreFactors(
  product: MarketplaceProduct,
  tags: string[],
  budget: number | null,
  learningProfile: LearningProfile,
  avoidTerms: string[],
) {
  const text = productTokens(product);
  const tagHits = tags.filter((tag) => text.includes(tag)).length;
  const rating = MARKETPLACE_RATINGS.get(product.id);
  const avg = rating?.avg_rating ? Number.parseFloat(String(rating.avg_rating)) : 4.5;
  const reviewCount = rating?.review_count ?? 100;
  const priceFit = budget
    ? product.price_cents <= budget * 100
      ? 100
      : Math.max(20, 100 - Math.round(((product.price_cents - budget * 100) / (budget * 100)) * 80))
    : 72;
  const previousOverlap = Math.max(0, Math.min(100, 74 + ((learningProfile.productWeights?.[product.slug] ?? 0) * 8)));
  const avoidPenalty = avoidTerms.some((term) => text.includes(term)) ? 18 : 0;

  return {
    interests: Math.max(35, Math.min(100, 52 + tagHits * 11 - avoidPenalty)),
    uniqueness: Math.max(40, Math.min(100, product.gift_match_score - product.category_rank)),
    priceFit,
    quality: Math.round(Math.min(100, avg * 20)),
    reviewSentiment: Math.max(45, Math.min(100, Math.round(avg * 17 + Math.log10(reviewCount + 1) * 7))),
    novelty: Math.max(42, Math.min(100, 96 - product.rank * 0.12)),
    previousOverlap,
  };
}

function totalGiftScore(factors: ReturnType<typeof giftScoreFactors>) {
  return Math.round(
    factors.interests * 0.28 +
    factors.uniqueness * 0.14 +
    factors.priceFit * 0.16 +
    factors.quality * 0.15 +
    factors.reviewSentiment * 0.12 +
    factors.novelty * 0.09 +
    factors.previousOverlap * 0.06,
  );
}

function scoreProduct(
  product: MarketplaceProduct,
  query: string,
  tags: string[],
  budget: number | null,
  learningProfile: LearningProfile,
  avoidTerms: string[],
) {
  const text = productTokens(product);
  const queryTerms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const exactTermHits = queryTerms.filter((term) => text.includes(term)).length;
  const tagHits = tags.filter((tag) => text.includes(tag)).length;
  const rating = MARKETPLACE_RATINGS.get(product.id);
  const ratingScore = rating?.avg_rating ? Number.parseFloat(String(rating.avg_rating)) / 5 : 0.8;
  const budgetScore = budget
    ? product.price_cents <= budget * 100
      ? 1
      : Math.max(0, 1 - (product.price_cents - budget * 100) / (budget * 100))
    : 0.65;
  const productBoost = learningProfile.productWeights?.[product.slug] ?? 0;
  const tagBoost = product.interests.reduce((total, tag) => total + (learningProfile.tagWeights?.[tag] ?? 0), 0);
  const avoidPenalty = avoidTerms.some((term) => text.includes(term)) ? 1.35 : 0;
  const dealBoost = product.sale_price_cents && product.gift_match_score >= 88 ? 0.28 : 0;

  return (
    product.gift_match_score / 100 +
    exactTermHits * 0.55 +
    tagHits * 0.85 +
    ratingScore * 0.5 +
    budgetScore * 0.65 +
    productBoost * 0.8 +
    tagBoost * 0.25 +
    dealBoost -
    avoidPenalty -
    product.category_rank * 0.015
  );
}

function generateMatchReason(product: MarketplaceProduct, tags: string[], budget: number | null, ctx: ParsedContext) {
  const matched = product.interests.filter((interest) => tags.includes(interest));
  if (ctx.recipient && matched.length > 0) {
    return `${ctx.recipient.charAt(0).toUpperCase() + ctx.recipient.slice(1)} loves ${matched.slice(0, 2).join(" and ")} — ${product.why_we_picked_it.toLowerCase()}`;
  }
  if (matched.length > 0) return `Why this gift: matched on ${matched.slice(0, 2).join(" + ")}. ${product.why_we_picked_it}`;
  if (budget && product.price_cents <= budget * 100) return `Why this gift: fits your $${budget} budget and ${product.why_we_picked_it.toLowerCase()}`;
  return `Why this gift: ${product.why_we_picked_it}`;
}

function generateAvoidanceWarning(product: MarketplaceProduct, avoidTerms: string[]) {
  const text = productTokens(product);
  const matched = avoidTerms.find((term) => text.includes(term));
  if (!matched) return null;
  return `Heads up — this may overlap with "${matched}" on your avoid list.`;
}

function buildFollowUp(ctx: ParsedContext) {
  const missing = missingContext(ctx);
  if (missing.includes("recipient") && missing.includes("occasion")) {
    return "Got it! Who's the gift for, and what's the occasion?";
  }
  if (missing.includes("recipient")) return "Who are you shopping for? Tell me a bit about them.";
  if (missing.includes("budget")) return "What's your budget? Even a rough range helps me narrow things down.";
  if (missing.includes("interests")) return "What do they love — hobbies, style, or things they mention often?";
  if (missing.includes("occasion")) return "What's the occasion? Birthday, thank-you, holiday, or something else?";
  return "Tell me a little more — who it's for, the occasion, budget, and a few interests.";
}

function buildResultsMessage(ctx: ParsedContext, count: number, usedLearning: boolean) {
  const who = ctx.recipient ? ` for ${ctx.recipient}` : "";
  const occasion = ctx.occasion ? ` (${ctx.occasion})` : "";
  const budget = ctx.budget ? ` under $${ctx.budget}` : "";
  const learning = usedLearning ? " I also factored in what you liked before." : "";

  if (count === 0) {
    return "I couldn't find a strong match yet. Try adding who it's for, the occasion, budget, and 2–3 interests.";
  }

  return `Here ${count === 1 ? "is" : "are"} ${count} thoughtful idea${count === 1 ? "" : "s"}${who}${occasion}${budget}. Each includes a short "why this gift" note.${learning} Want something more personal or more fun? Just say the word.`;
}

export function recommendGifts(query: string, learningProfile: LearningProfile = {}): GiftRecommendResponse {
  const trimmed = query.trim();
  if (!trimmed) {
    return { message: "Tell me who you're shopping for and I'll get started.", results: [], tags: [], budget: null, needsFollowUp: true };
  }

  if (isGreeting(trimmed)) {
    return {
      message: "Hey! I'm Givit — your gifting companion. Tell me who you're shopping for, the occasion, and your budget, and I'll find thoughtful picks with a reason for each one.",
      results: [],
      tags: [],
      budget: null,
      needsFollowUp: true,
    };
  }

  if (isHelpQuery(trimmed)) {
    return {
      message: "I help you find personalized gifts through conversation. Share who it's for, the occasion, budget, interests, and anything to avoid — I'll rank curated products and explain why each fits.",
      results: [],
      tags: [],
      budget: null,
      needsFollowUp: true,
    };
  }

  const ctx = parseContext(trimmed);
  const tags = extractTags(trimmed);
  const budget = ctx.budget;
  const avoidTerms = ctx.avoid;
  const missing = missingContext(ctx);

  if (missing.length >= 3 && tags.length < 2) {
    return {
      message: buildFollowUp(ctx),
      results: [],
      tags,
      budget,
      needsFollowUp: true,
    };
  }

  const usedLearning = Boolean(
    Object.keys(learningProfile.productWeights ?? {}).length ||
    Object.keys(learningProfile.tagWeights ?? {}).length,
  );

  const results = getAllMarketplaceProducts()
    .map((product) => ({ product, score: scoreProduct(product, trimmed, tags, budget, learningProfile, avoidTerms) }))
    .filter(({ score }) => score > 1.25 || tags.length === 0)
    .sort((a, b) => b.score - a.score || a.product.rank - b.product.rank)
    .slice(0, 5)
    .map(({ product }, index) => {
      const rating = MARKETPLACE_RATINGS.get(product.id);
      const factors = giftScoreFactors(product, tags, budget, learningProfile, avoidTerms);
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price_cents: product.price_cents,
        sale_price_cents: product.sale_price_cents ?? null,
        description: product.ai_summary,
        image_url: resolveProductImageSrc(product.id, product.images),
        avg_rating: rating?.avg_rating ? Number.parseFloat(String(rating.avg_rating)) : null,
        review_count: rating?.review_count ?? 0,
        match_reason: generateMatchReason(product, tags, budget, ctx),
        avoidance_warning: generateAvoidanceWarning(product, avoidTerms),
        gift_tags: product.interests,
        rank_label: `#${index + 1} pick`,
        learning_tags: [...product.interests, ...product.recipients, ...product.occasions].slice(0, 8),
        gift_score: { total: totalGiftScore(factors), factors },
      };
    });

  return {
    message: buildResultsMessage(ctx, results.length, usedLearning),
    results,
    tags,
    budget,
    needsFollowUp: results.length === 0,
  };
}
