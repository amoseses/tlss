import fs from "fs";
import path from "path";
import { restFetch } from "./supabase-rest.mjs";

function saveLocalPriceOverride(key, entry) {
  if (!key) return false;
  try {
    const filePath = path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/live-prices.json");
    let current = {};
    if (fs.existsSync(filePath)) {
      current = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{}");
    }
    current[key] = entry;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("price-update.mjs: Local file save skipped:", err?.message);
    return false;
  }
}

/**
 * Updates dynamic price information for a product by URL, product ID, or slug.
 * Safely updates Supabase if configured and persists local JSON cache for seed catalog items.
 */
export async function updateProductPrice(params) {
  const { url, productId, slug, priceCents, salePriceCents, currency = "USD" } = params;

  if (!priceCents || typeof priceCents !== "number" || priceCents <= 0) {
    throw new Error("Invalid priceCents: must be a positive integer in cents.");
  }

  const payload = {
    price_cents: Math.round(priceCents),
    sale_price_cents: salePriceCents ? Math.round(salePriceCents) : null,
    updated_at: new Date().toISOString(),
  };

  let updatedRow = null;

  try {
    if (productId) {
      const rows = await restFetch(`products?id=eq.${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      updatedRow = rows?.[0] ?? null;
    } else if (slug) {
      const rows = await restFetch(`products?slug=eq.${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      updatedRow = rows?.[0] ?? null;
    } else if (url) {
      const cleanUrl = url.trim();
      const rows = await restFetch(`products?affiliate_url=eq.${encodeURIComponent(cleanUrl)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      updatedRow = rows?.[0] ?? null;
    }
  } catch (err) {
    console.warn("price-update.mjs: DB sync skipped or unavailable:", err?.message);
  }

  // Also write to local dynamic price JSON so seed products update immediately in dev/preview
  let localSaved = false;
  if (url) localSaved = saveLocalPriceOverride(url.trim(), payload) || localSaved;
  if (slug) localSaved = saveLocalPriceOverride(slug.trim(), payload) || localSaved;
  if (productId) localSaved = saveLocalPriceOverride(productId.trim(), payload) || localSaved;

  return {
    success: true,
    matched: Boolean(updatedRow) || localSaved,
    productId: productId || updatedRow?.id || null,
    slug: slug || updatedRow?.slug || null,
    url: url || updatedRow?.affiliate_url || null,
    priceCents: Math.round(priceCents),
    salePriceCents: salePriceCents ? Math.round(salePriceCents) : null,
    currency,
    updatedAt: payload.updated_at,
  };
}
