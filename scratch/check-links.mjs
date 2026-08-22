import fs from "fs";
import path from "path";

// Read marketplace.ts content to extract products & affiliate URLs
const marketplaceFile = fs.readFileSync(
  path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/marketplace.ts"),
  "utf-8"
);
const expandedFile = fs.readFileSync(
  path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/marketplace-expanded.ts"),
  "utf-8"
);

// Helper to extract objects with slug, name, brand, affiliateUrl
function extractProductsFromSource() {
  const products = [];

  // Match affiliateUrl in CORE_PRODUCTS
  const coreRegex = /slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*brand:\s*"([^"]+)"[\s\S]*?affiliateUrl:\s*"([^"]+)"/g;
  let match;
  while ((match = coreRegex.exec(marketplaceFile)) !== null) {
    products.push({ slug: match[1], name: match[2], brand: match[3], url: match[4], source: "CORE_PRODUCTS" });
  }

  // Match GENERATED_IDEAS tuples: ["slug", "name", "brand", price, "retailer", "url", ...]
  const ideaRegex = /\[\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\d+,\s*"([^"]+)",\s*"([^"]+)"/g;
  while ((match = ideaRegex.exec(marketplaceFile)) !== null) {
    products.push({ slug: match[1], name: match[2], brand: match[3], url: match[5], source: "GENERATED_IDEAS" });
  }

  // Match EXPANDED_CURATED_PRODUCTS
  const expandedRegex = /slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*brand:\s*"([^"]+)"[\s\S]*?affiliateUrl:\s*"([^"]+)"/g;
  while ((match = expandedRegex.exec(expandedFile)) !== null) {
    products.push({ slug: match[1], name: match[2], brand: match[3], url: match[4], source: "EXPANDED_CURATED_PRODUCTS" });
  }

  return products;
}

const products = extractProductsFromSource();
console.log(`Extracted ${products.length} product links to test.`);

async function checkLink(prod) {
  try {
    const res = await fetch(prod.url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    // Also try GET if HEAD returns 405 Method Not Allowed or 403
    let status = res.status;
    let finalUrl = res.url;

    if (status === 405 || status === 403) {
      const getRes = await fetch(prod.url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      status = getRes.status;
      finalUrl = getRes.url;
    }

    return { ...prod, status, finalUrl, ok: status >= 200 && status < 400 };
  } catch (err) {
    return { ...prod, status: "ERROR", error: err.message, ok: false };
  }
}

async function run() {
  const results = [];
  for (let i = 0; i < products.length; i += 5) {
    const chunk = products.slice(i, i + 5);
    const batch = await Promise.all(chunk.map(checkLink));
    results.push(...batch);
    console.log(`Processed ${Math.min(i + 5, products.length)} / ${products.length}`);
  }

  fs.writeFileSync(
    path.resolve(process.cwd(), "scratch/link-check-results.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("Done checking links. Saved to scratch/link-check-results.json");
}

run();
