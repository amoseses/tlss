import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tag extraction — maps natural language to product gift_tags
const TAG_MAP: Record<string, string[]> = {
  // Relationships
  mom: ["home", "comfort", "self-care", "cooking", "gardening"],
  mother: ["home", "comfort", "self-care", "cooking"],
  dad: ["tools", "outdoors", "tech", "sports", "grilling"],
  father: ["tools", "outdoors", "tech", "sports"],
  friend: ["fun", "lifestyle", "giftable", "unique"],
  partner: ["romantic", "luxury", "self-care", "experience"],
  husband: ["tech", "outdoors", "sports", "tools"],
  wife: ["jewelry", "beauty", "self-care", "home"],
  kid: ["toys", "educational", "creative", "fun"],
  child: ["toys", "educational", "creative", "fun"],
  coworker: ["desk", "coffee", "snacks", "lifestyle", "neutral"],
  grandma: ["comfort", "home", "garden", "crafts"],
  grandpa: ["outdoors", "history", "tools", "comfort"],
  sister: ["beauty", "fashion", "lifestyle", "fun"],
  brother: ["tech", "sports", "gaming", "outdoors"],

  // Interests
  cooking: ["kitchen", "baking", "food", "gourmet", "cooking"],
  gardening: ["garden", "plants", "outdoors", "nature"],
  fitness: ["gym", "health", "yoga", "sports", "fitness"],
  tech: ["gadgets", "electronics", "tech"],
  reading: ["books", "education", "cozy"],
  art: ["painting", "creative", "design", "crafts"],
  music: ["music", "audio", "entertainment"],
  travel: ["travel", "adventure", "outdoor"],
  gaming: ["gaming", "entertainment", "tech"],
  yoga: ["yoga", "wellness", "self-care", "fitness"],
  coffee: ["coffee", "kitchen", "gourmet"],
  outdoors: ["outdoor", "adventure", "nature", "sports"],
  beauty: ["beauty", "self-care", "skincare"],
  fashion: ["fashion", "accessories", "style"],

  // Occasions
  birthday: ["giftable", "celebration", "fun"],
  anniversary: ["romantic", "luxury", "memorable"],
  christmas: ["holiday", "cozy", "giftable"],
  holiday: ["holiday", "cozy", "giftable"],
  graduation: ["milestone", "professional", "achievement"],
  wedding: ["home", "luxury", "romantic"],
  "mother's day": ["home", "comfort", "self-care", "cooking"],
  "father's day": ["tools", "outdoors", "tech", "sports"],
};

function extractTags(query: string): string[] {
  const lower = query.toLowerCase();
  const tags = new Set<string>();

  for (const [keyword, mappedTags] of Object.entries(TAG_MAP)) {
    if (lower.includes(keyword)) {
      mappedTags.forEach((t) => tags.add(t));
    }
  }

  return Array.from(tags);
}

function extractBudget(query: string): number | null {
  // Match patterns: "$50", "50 dollars", "under $100", "up to 75", "budget of $40-60"
  const patterns = [
    /\$(\d+)/g,
    /(\d+)\s*(?:dollars?|bucks?)/gi,
    /(?:under|below|max|maximum|up to|budget(?:\s+of)?)\s*\$?(\d+)/gi,
    /(\d+)\s*-\s*\$?(\d+)/g, // range — take the higher end
  ];

  const found: number[] = [];
  for (const pattern of patterns) {
    const matches = [...query.matchAll(pattern)];
    for (const m of matches) {
      const n = parseInt(m[2] ?? m[1]);
      if (!isNaN(n) && n > 0 && n < 10000) found.push(n);
    }
  }

  return found.length > 0 ? Math.max(...found) : null;
}

function generateMatchReason(product: Record<string, unknown>, tags: string[]): string {
  const productTags = (product.gift_tags as string[]) || [];
  const matched = productTags.filter((t) => tags.includes(t));

  if (matched.length > 0) {
    const readable = matched.slice(0, 2).map((t) => t.replace(/-/g, " "));
    return `Great match for ${readable.join(" & ")}`;
  }
  return "Top-rated gift pick";
}

function generateAIMessage(query: string, count: number, budget: number | null): string {
  const lq = query.toLowerCase();

  const relationship = Object.keys(TAG_MAP).find(
    (k) => ["mom", "dad", "friend", "partner", "husband", "wife", "sister", "brother", "grandma", "grandpa", "coworker"].includes(k) && lq.includes(k)
  );

  const budgetStr = budget ? ` under $${budget}` : "";
  const forStr = relationship ? ` for ${relationship}` : "";

  if (count === 0) {
    return `I couldn't find exact matches${forStr}${budgetStr}. Try broadening your budget or describing their interests differently.`;
  }

  const openers = [
    `Here are my top ${count} gift picks${forStr}${budgetStr} — I think any of these would be a hit! 🎁`,
    `I found ${count} great options${forStr}${budgetStr}. Here's what I'd recommend:`,
    `Based on what you told me, here are ${count} gifts${forStr}${budgetStr} that our buyers love:`,
  ];

  return openers[Math.floor(Math.random() * openers.length)];
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const supabase = await createClient();
    const tags = extractTags(query);
    const budget = extractBudget(query);

    // Build Supabase query
    let dbQuery = supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        price_cents,
        description,
        gift_tags,
        occasion_tags,
        relationship_tags,
        images:product_images(storage_path, sort_order)
      `)
      .eq("is_published", true)
      .gt("stock", 0);

    // Budget filter — allow 20% over budget for flexibility
    if (budget) {
      dbQuery = dbQuery.lte("price_cents", budget * 120);
    }

    const { data: products, error } = await dbQuery.limit(50);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Score products
    type ScoredProduct = {
      product: Record<string, unknown>;
      score: number;
    };

    const scored: ScoredProduct[] = (products ?? []).map((product) => {
      const productTags = [
        ...((product.gift_tags as string[]) || []),
        ...((product.occasion_tags as string[]) || []),
        ...((product.relationship_tags as string[]) || []),
      ];

      const tagOverlap = tags.length > 0
        ? productTags.filter((t) => tags.includes(t)).length / Math.max(tags.length, 1)
        : 0;

      const budgetScore = budget
        ? Math.max(0, 1 - Math.abs(product.price_cents as number - budget * 100) / (budget * 100))
        : 0.5;

      const score = 0.6 * tagOverlap + 0.4 * budgetScore;

      return { product: product as Record<string, unknown>, score };
    });

    // Sort by score, take top 6
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 6);

    // Format results
    const results = top.map(({ product }) => {
      const images = (product.images as Array<{ storage_path: string; sort_order: number }>) || [];
      images.sort((a, b) => a.sort_order - b.sort_order);
      const firstImage = images[0];
      const imageUrl = firstImage
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage.storage_path}`
        : null;

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price_cents: product.price_cents,
        description: product.description,
        image_url: imageUrl,
        avg_rating: null, // can join rating stats if needed
        review_count: 0,
        match_reason: generateMatchReason(product, tags),
        gift_tags: (product.gift_tags as string[]) || [],
      };
    });

    return NextResponse.json({
      message: generateAIMessage(query, results.length, budget),
      results,
      tags,
      budget,
    });
  } catch (err) {
    console.error("Gift recommend error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
