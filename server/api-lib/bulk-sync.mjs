import { fetchPageMetadata } from "./metadata.mjs";
import { updateProductPrice } from "./price-update.mjs";

function extractPriceFromMeta(meta) {
  if (!meta) return null;

  // 1. Direct price fields from Microlink / OpenGraph metadata
  if (typeof meta.price === "number" && meta.price > 0) return meta.price;
  if (typeof meta.price === "string") {
    const cleaned = meta.price.replace(/[^0-9.]/g, "");
    const num = Number.parseFloat(cleaned);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  // 2. Search description / title for price patterns like "$179.99" or "$248.00"
  const text = `${meta.title || ""} ${meta.description || ""}`;
  const priceMatches = text.match(/\$\s*([0-9]{1,4}(?:\.[0-9]{2})?)/g);
  if (priceMatches && priceMatches.length > 0) {
    const numbers = priceMatches
      .map((m) => Number.parseFloat(m.replace(/[^0-9.]/g, "")))
      .filter((n) => !Number.isNaN(n) && n >= 5 && n <= 5000);
    if (numbers.length > 0) {
      // Pick the primary price found
      return numbers[0];
    }
  }

  return null;
}

export async function syncCatalogItem(item) {
  const { slug, affiliateUrl, id } = item;
  if (!affiliateUrl || affiliateUrl.includes("givit.local")) {
    return { slug, status: "skipped", reason: "Internal or experience link" };
  }

  try {
    const meta = await fetchPageMetadata(affiliateUrl);
    const extractedPrice = extractPriceFromMeta(meta);

    if (!extractedPrice) {
      return { slug, status: "skipped", reason: "No price metadata detected on vendor page" };
    }

    const priceCents = Math.round(extractedPrice * 100);
    const result = await updateProductPrice({
      url: affiliateUrl,
      slug,
      productId: id,
      priceCents,
    });

    return { slug, status: "updated", priceCents, result };
  } catch (error) {
    return { slug, status: "failed", error: error?.message ?? "Sync error" };
  }
}

export async function syncCatalogBatch(items, batchSize = 3, delayMs = 300) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(chunk.map((item) => syncCatalogItem(item)));
    results.push(...batchResults);
    if (i + batchSize < items.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}
