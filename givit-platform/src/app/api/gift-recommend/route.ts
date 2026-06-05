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

function scoreProduct(product: MarketplaceProduct, query: string, tags: string[], budget: number | null, learningProfile: LearningProfile) {
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

  return (
    product.gift_match_score / 100 +
    exactTermHits * 0.55 +
    tagHits * 0.85 +
    ratingScore * 0.5 +
    budgetScore * 0.65 +
    productBoost * 0.8 +
    tagBoost * 0.25 -
    product.category_rank * 0.015
  );
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
  return `I ranked ${count} gift ideas${budgetLabel} from the Givit marketplace based on your questionnaire.${learningLabel} Tell me if these feel right and I will keep learning.`;
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
    const usedLearning = Boolean(
      Object.keys(learningProfile.productWeights ?? {}).length || Object.keys(learningProfile.tagWeights ?? {}).length,
    );

    const results = MARKETPLACE_PRODUCTS
      .map((product) => ({ product, score: scoreProduct(product, query, tags, budget, learningProfile) }))
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
          description: product.ai_summary,
          image_url: resolveProductImageSrc(product.id, product.images),
          avg_rating: rating?.avg_rating ? Number.parseFloat(String(rating.avg_rating)) : null,
          review_count: rating?.review_count ?? 0,
          match_reason: generateMatchReason(product, tags, budget),
          gift_tags: product.interests,
          category: product.category?.name ?? "Marketplace",
          rank_label: `#${index + 1} in ${query.trim()}`,
          learning_tags: [...product.interests, ...product.recipients, ...product.occasions].slice(0, 8),
        };
      });

    return NextResponse.json({
      message: generateAIMessage(query, results.length, budget, usedLearning),
      results,
      tags,
      budget,
      questionnaire_hint: "Best results include recipient, relationship, occasion, budget, interests, and what to avoid.",
    });
  } catch (err) {
    console.error("Gift recommend error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
