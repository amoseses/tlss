import { fetchPageMetadata } from "./metadata.mjs";
import { restFetch } from "./supabase-rest.mjs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const ALLOWED_CATEGORIES = [
  "tech",
  "kitchen",
  "writing",
  "beauty",
  "fitness",
  "outdoor",
  "pets",
  "art",
  "experiences",
  "home",
  "gaming",
];

function normalizeUrl(value) {
  try {
    const url = new URL(value.trim());

    // Remove tracking parameters.
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "tag",
      "ref",
      "ref_",
      "fbclid",
      "gclid",
    ];

    trackingParams.forEach((param) => url.searchParams.delete(param));

    return url.toString();
  } catch {
    throw new Error("Invalid product URL.");
  }
}

function slugify(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getRetailer(url, metadata) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes("amazon")) return "Amazon";
    if (hostname.includes("walmart")) return "Walmart";
    if (hostname.includes("ebay")) return "eBay";
    if (hostname.includes("etsy")) return "Etsy";
    if (hostname.includes("daraz")) return "Daraz";
    if (hostname.includes("bestbuy")) return "Best Buy";
    if (hostname.includes("target")) return "Target";

    return (
      metadata?.publisher ||
      metadata?.siteName ||
      hostname.replace(/^www\./, "")
    );
  } catch {
    return metadata?.publisher || null;
  }
}

function getImageUrl(productUrl) {
  // Use the existing server-side image proxy.
  return `/api/photo?url=${encodeURIComponent(productUrl)}`;
}

async function findExistingProduct(productUrl) {
  const encoded = encodeURIComponent(productUrl);

  const rows = await restFetch(
    `products?select=id,name,slug,affiliate_url&affiliate_url=eq.${encoded}&limit=1`
  );

  return rows?.[0] ?? null;
}

async function generateUniqueSlug(baseSlug) {
  const existing = await restFetch(
    `products?select=id&slug=eq.${encodeURIComponent(baseSlug)}&limit=1`
  );

  if (!existing?.length) {
    return baseSlug;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function normalizeWithAI(productUrl, metadata) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const metadataForAI = {
    title: metadata?.title ?? null,
    description: metadata?.description ?? null,
    publisher: metadata?.publisher ?? null,
    author: metadata?.author ?? null,
    date: metadata?.date ?? null,
    url: productUrl,
    price: metadata?.price ?? null,
    currency: metadata?.currency ?? null,
  };

  const systemPrompt = `
You normalize ecommerce product information for a gift marketplace.

Use ONLY the supplied webpage metadata.
Do not invent specifications, features, prices, brands, availability, or shipping information.

Return ONLY valid JSON.

Required JSON structure:
{
  "name": "string",
  "brand": "string or null",
  "description": "string",
  "category": "one allowed category",
  "priceCents": "integer or null",
  "interests": ["string"],
  "occasions": ["string"],
  "recipients": ["string"],
  "giftMatchScore": "integer from 0 to 100",
  "whyWePickedIt": "string"
}

Allowed categories:
${ALLOWED_CATEGORIES.join(", ")}

Rules:
- Keep the product name concise and natural.
- Extract the brand only when supported by the metadata.
- Do not fabricate a price.
- If price is unavailable, return null.
- priceCents must represent the detected price in the source currency's smallest unit.
- Keep interests concise.
- Use common gift occasions such as birthday, holiday, graduation, Father's Day, Mother's Day, wedding, anniversary, etc. only when reasonably relevant.
- Recipients should describe likely users of the product.
- giftMatchScore is a marketplace gift relevance score, not a factual product rating.
- whyWePickedIt should briefly explain why the product can work as a gift.
`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(metadataForAI),
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        `Groq request failed with status ${response.status}`
    );
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Groq returned invalid JSON.");
  }

  if (!parsed.name) {
    throw new Error("AI normalization did not return a product name.");
  }

  const category = ALLOWED_CATEGORIES.includes(parsed.category)
    ? parsed.category
    : "home";

  return {
    name: String(parsed.name).trim(),
    brand: parsed.brand ? String(parsed.brand).trim() : null,
    description: parsed.description
      ? String(parsed.description).trim()
      : null,
    category,
    priceCents:
      Number.isInteger(parsed.priceCents) && parsed.priceCents >= 0
        ? parsed.priceCents
        : null,
    interests: Array.isArray(parsed.interests)
      ? parsed.interests.map(String).slice(0, 10)
      : [],
    occasions: Array.isArray(parsed.occasions)
      ? parsed.occasions.map(String).slice(0, 10)
      : [],
    recipients: Array.isArray(parsed.recipients)
      ? parsed.recipients.map(String).slice(0, 10)
      : [],
    giftMatchScore:
      Number.isInteger(parsed.giftMatchScore)
        ? Math.max(0, Math.min(100, parsed.giftMatchScore))
        : 0,
    whyWePickedIt: parsed.whyWePickedIt
      ? String(parsed.whyWePickedIt).trim()
      : null,
  };
}

export async function importProductFromUrl(inputUrl) {
  const productUrl = normalizeUrl(inputUrl);

  // 1. Check for an existing import.
  const existing = await findExistingProduct(productUrl);

  if (existing) {
    return {
      created: false,
      duplicate: true,
      product: existing,
    };
  }

  // 2. Fetch webpage metadata through the existing Microlink helper.
  const metadata = await fetchPageMetadata(productUrl);

  if (!metadata) {
    throw new Error(
      "Could not extract product metadata from this URL."
    );
  }

  // 3. Normalize metadata with Groq.
  const normalized = await normalizeWithAI(productUrl, metadata);

  // 4. Generate a unique marketplace slug.
  const baseSlug = slugify(normalized.name);
  const slug = await generateUniqueSlug(baseSlug);

  // 5. Use existing image proxy.
  const imageUrl = getImageUrl(productUrl);

  // 6. Determine retailer.
  const retailer = getRetailer(productUrl, metadata);

  // 7. Build the same structure used by your existing products.
  const product = {
    name: normalized.name,
    slug,
    description: normalized.description,
    price_cents: normalized.priceCents ?? 0,

    min_order_qty: 1,

    // Affiliate products do not represent inventory owned by GIVIT.
    // Keep this at 0 until your marketplace has an external-stock model.
    stock: 0,

    is_published: false,
    is_approved: false,

    seller_id: null,
    category_id: null,
    submitted_by: null,

    images: imageUrl ? [imageUrl] : [],

    metadata: {
      category: normalized.category,
      imported: true,
      import_source: productUrl,
    },

    affiliate_url: productUrl,
    retailer,
    brand: normalized.brand,

    gift_match_score: normalized.giftMatchScore,

    interests: normalized.interests,
    occasions: normalized.occasions,
    recipients: normalized.recipients,

    ai_summary: normalized.description,
    why_we_picked_it: normalized.whyWePickedIt,

    rank: null,
    category_rank: null,
  };

  // 8. Insert into Supabase.
  const inserted = await restFetch("products", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(product),
  });

  const createdProduct = inserted?.[0];

  if (!createdProduct) {
    throw new Error("Product was not created in Supabase.");
  }

  return {
    created: true,
    duplicate: false,
    product: createdProduct,
  };
}