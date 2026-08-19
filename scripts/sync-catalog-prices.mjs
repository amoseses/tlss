import { syncCatalogBatch } from "../server/api-lib/bulk-sync.mjs";

const CORE_CATALOG_ITEMS = [
  { slug: "sony-wh-1000xm5", affiliateUrl: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b" },
  { slug: "kindle-paperwhite", affiliateUrl: "https://www.amazon.com/dp/B08KTZ8249" },
  { slug: "anker-737-power-bank", affiliateUrl: "https://www.anker.com/products/a1289" },
  { slug: "apple-pencil-pro", affiliateUrl: "https://www.apple.com/apple-pencil/" },
  { slug: "apple-airtags-4-pack", affiliateUrl: "https://www.apple.com/airtag/" },
  { slug: "lego-botanicals-orchid", affiliateUrl: "https://www.lego.com/en-us/product/orchid-10311" },
  { slug: "ember-temperature-control-mug", affiliateUrl: "https://ember.com/products/ember-mug-2" },
  { slug: "theragun-mini", affiliateUrl: "https://www.therabody.com/us/en-us/theragun-mini.html" },
  { slug: "stanley-quencher-h2-0", affiliateUrl: "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz" },
  { slug: "aeropress-clear", affiliateUrl: "https://aeropress.com/products/aeropress-clear" },
  { slug: "patagonia-black-hole-duffel", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55-liters/49343.html" },
  { slug: "nintendo-switch-oled", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/" },
  { slug: "dyson-airwrap", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap" },
  { slug: "brooklinen-super-plush-robe", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robes" },
];

async function main() {
  console.log("Starting bulk catalog price hydration...");
  const results = await syncCatalogBatch(CORE_CATALOG_ITEMS, 3, 300);

  console.log("\n--- Bulk Sync Results ---");
  for (const r of results) {
    if (r.status === "updated") {
      console.log(`[UPDATED] ${r.slug}: $${(r.priceCents / 100).toFixed(2)}`);
    } else if (r.status === "skipped") {
      console.log(`[SKIPPED] ${r.slug}: ${r.reason}`);
    } else {
      console.log(`[FAILED] ${r.slug}: ${r.error}`);
    }
  }

  const updatedCount = results.filter((r) => r.status === "updated").length;
  console.log(`\nCompleted: ${updatedCount}/${results.length} items updated.`);
}

main().catch(console.error);
