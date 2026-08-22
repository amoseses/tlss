import fs from "fs";
import path from "path";
import { syncCatalogBatch } from "../server/api-lib/bulk-sync.mjs";

const marketplaceFile = fs.readFileSync(
  path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/marketplace.ts"),
  "utf-8"
);

const products = [];

// Extract CORE_PRODUCTS
const coreRegex = /slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"[\s\S]*?affiliateUrl:\s*"([^"]+)"/g;
let match;
while ((match = coreRegex.exec(marketplaceFile)) !== null) {
  products.push({ slug: match[1], name: match[2], affiliateUrl: match[3] });
}

// Extract GENERATED_IDEAS
const ideaRegex = /\[\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\d+,\s*"([^"]+)",\s*"([^"]+)"/g;
while ((match = ideaRegex.exec(marketplaceFile)) !== null) {
  products.push({ slug: match[1], name: match[2], affiliateUrl: match[5] });
}

console.log(`Starting bulk price sync for ${products.length} products with updated URLs...`);

async function run() {
  const results = await syncCatalogBatch(products, 4, 300);

  const updated = results.filter((r) => r.status === "updated");
  const skipped = results.filter((r) => r.status === "skipped");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n=== DYNAMIC PRICE SYNC RESULTS ===");
  console.log(`Total Processed: ${results.length}`);
  console.log(`Updated Live Prices: ${updated.length}`);
  console.log(`Skipped (Experiences/No price meta): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (updated.length > 0) {
    console.log("\nUpdated Items:");
    for (const u of updated) {
      console.log(`  ✓ [${u.slug}]: $${(u.priceCents / 100).toFixed(2)}`);
    }
  }

  // Also view current live-prices.json
  const livePricesPath = path.resolve(
    process.cwd(),
    "artifacts/givit-platform/src/lib/data/live-prices.json"
  );
  if (fs.existsSync(livePricesPath)) {
    const livePrices = JSON.parse(fs.readFileSync(livePricesPath, "utf-8"));
    console.log(`\n live-prices.json now contains ${Object.keys(livePrices).length} price records:`);
    console.log(JSON.stringify(livePrices, null, 2));
  }
}

run();
