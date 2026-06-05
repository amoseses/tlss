import { NextRequest, NextResponse } from "next/server";

import {
  MARKETPLACE_PRODUCTS,
  MARKETPLACE_RATINGS,
  type MarketplaceProduct,
} from "@/lib/data/marketplace";
import { resolveProductImageSrc } from "@/lib/product-photo";

// Keyword extraction maps questionnaire language to the curated marketplace facets.
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
  niece: ["kid", "creative", "art", "toys"],
  nephew: ["kid", "gaming", "creative", "toys"],
  grandparents: ["home", "comfort", "reading", "family"],

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
  outdoors: ["outdoor", "adventure", "nature", "sports"],
  beauty: ["beauty", "self care", "skincare"],
  pens: ["pens", "writing", "journaling", "office", "school"],
  pen: ["pens", "writing", "journaling", "office", "school"],
  journaling: ["journaling", "writing", "pens", "planning"],

  birthday: ["birthday", "giftable", "fun"],
  anniversary: ["anniversary", "romantic", "keepsake"],
  christmas: ["christmas", "holiday", "cozy"],
  holiday: ["holiday", "cozy", "giftable"],
  graduation: ["graduation", "milestone", "school", "professional"],
  wedding: ["wedding", "home", "romantic"],
  retirement: ["retirement", "writing", "experience", "keepsake"],
  sentimental: ["keepsake", "romantic", "family"],
  practical: ["useful", "office", "home", "travel"],
  luxury: ["premium", "self care", "design"],
  unique: ["unique", "novelty", "creative"],
};

type LearningProfile = {
  productWeights?: Record<string, number>;
  tagWeights?: Record<string, number>;
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

function productTokens(product: MarketplaceProduct) {
  return [
    product.name,
    product.brand,
    product.retailer,
    product.category?.name,
    product.ai_summary,
    product.why_we_picked_it,
    product.tested_badge,
    ...product.interests,
    ...product.occasions,
    ...product.recipients,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function extractAvoidTerms(query: string) {
  const lower = query.toLowerCase();
  const avoidMatch = lower.match(/(?:avoid|no|not|dont|don\'t|without)[:\s]+([^.;]+)/);
  if (!avoidMatch) return [];
  return avoidMatch[1].split(/,| and | or |\//).map((term) => term.trim()).filter((term) => term.length > 2);
}

function giftScoreFactors(product: MarketplaceProduct, query: string, tags: string[], budget: number | null, learningProfile: LearningProfile, avoidTerms: string[]) {
  const text = productTokens(product);
  const tagHits = tags.filter((tag) => text.includes(tag)).length;
  const rating = MARKETPLACE_RATINGS.get(product.id);
  const avg = rating?.avg_rating ? Number.parseFloat(String(rating.avg_rating)) : 4.5;
  const reviewCount = rating?.review_count ?? 100;
  const priceFit = budget ? (product.price_cents <= budget * 100 ? 100 : Math.max(20, 100 - Math.round(((product.price_cents - budget * 100) / (budget * 100)) * 80))) : 72;
  const previousOverlap = Math.max(0, Math.min(100, 74 + ((learningProfile.productWeights?.[product.slug] ?? 0) * 8)));
  const avoidPenalty = avoidTerms.some((term) => text.includes(term)) ? 18 : 0;
  return {
    interests: Math.max(35, Math.min(100, 52 + tagHits * 11 - avoidPenalty)),
    uniqueness: Math.max(40, Math.min(100, product.gift_match_score - product.category_rank + (text.includes("unique") ? 5 : 0))),
    priceFit,
    quality: Math.round(Math.min(100, avg * 20)),
    reviewSentiment: Math.max(45, Math.min(100, Math.round(avg * 17 + Math.log10(reviewCount + 1) * 7))),
    novelty: Math.max(42, Math.min(100, 96 - product.rank * 0.12 + (text.includes("new") ? 4 : 0))),
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

function scoreProduct(product: MarketplaceProduct, query: string, tags: string[], budget: number | null, learningProfile: LearningProfile, avoidTerms: string[]) {
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

function generateAvoidanceWarning(product: MarketplaceProduct, avoidTerms: string[]) {
  const text = productTokens(product);
  const matched = avoidTerms.find((term) => text.includes(term));
  if (!matched) return null;
  return `Gift Avoidance Engine: this may conflict with “${matched},” so only choose it if that avoid-list item is flexible.`;
}

function generateMatchReason(product: MarketplaceProduct, tags: string[], budget: number | null) {
  const matched = product.interests.filter((interest) => tags.includes(interest));
  if (matched.length > 0) return `Matched on ${matched.slice(0, 2).join(" + ")}`;
  if (budget && product.price_cents <= budget * 100) return `Fits the $${budget} budget`;
  return product.why_we_picked_it;
}

function generateAIMessage(query: string, count: number, budget: number | null, usedLearning: boolean) {
  if (count === 0) {
    return "I could not find a strong match yet. Try adding who it is for, the occasion, budget, and 2-3 interests.";
  }

  const budgetLabel = budget ? ` under $${budget}` : "";
  const learningLabel = usedLearning ? " I also adjusted the ranking using what you liked before." : "";
  return `I ranked ${count} gift ideas${budgetLabel} using Givit’s Gift Match Score: recipient interests, uniqueness, price fit, quality, review sentiment, novelty, and previous-gift overlap.${learningLabel} I also ran the Gift Avoidance Engine against anything you said to avoid.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body?.query;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const learningProfile = (body.learningProfile ?? {}) as LearningProfile;
    const tags = extractTags(query);
    const budget = extractBudget(query);
    const avoidTerms = extractAvoidTerms(query);
    const usedLearning = Boolean(
      Object.keys(learningProfile.productWeights ?? {}).length || Object.keys(learningProfile.tagWeights ?? {}).length,
    );

    const results = MARKETPLACE_PRODUCTS
      .map((product) => ({ product, score: scoreProduct(product, query, tags, budget, learningProfile, avoidTerms) }))
      .filter(({ score }) => score > 1.25 || tags.length === 0)
      .sort((a, b) => b.score - a.score || a.product.rank - b.product.rank)
      .slice(0, 6)
      .map(({ product }, index) => {
        const rating = MARKETPLACE_RATINGS.get(product.id);
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
          match_reason: generateMatchReason(product, tags, budget),
          avoidance_warning: generateAvoidanceWarning(product, avoidTerms),
          gift_tags: product.interests,
          category: product.category?.name ?? "Marketplace",
          rank_label: `#${index + 1} in ${query.trim()}`,
          learning_tags: [...product.interests, ...product.recipients, ...product.occasions].slice(0, 8),
          gift_score: (() => {
            const factors = giftScoreFactors(product, query, tags, budget, learningProfile, avoidTerms);
            return { total: totalGiftScore(factors), factors };
          })(),
        };
      });

    return NextResponse.json({
      message: generateAIMessage(query, results.length, budget, usedLearning),
      results,
      tags,
      budget,
      avoidTerms,
      questionnaire_hint: "Best results include recipient, relationship, occasion, budget, interests, and what to avoid.",
    });
  } catch (err) {
    console.error("Gift recommend error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
