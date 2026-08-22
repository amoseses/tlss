/// <reference path="../mjs-modules.d.ts" />
import { syncCatalogBatch } from "../../server/api-lib/bulk-sync.mjs";

const DEFAULT_ITEMS = [
  { slug: "sony-wh-1000xm5", affiliateUrl: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b" },
  { slug: "kindle-paperwhite", affiliateUrl: "https://www.amazon.com/dp/B08KTZ8249" },
  { slug: "pilot-custom-823", affiliateUrl: "https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber" },
  { slug: "anker-737-power-bank", affiliateUrl: "https://www.anker.com/products/a1289" },
  { slug: "apple-pencil-pro", affiliateUrl: "https://www.apple.com/apple-pencil/" },
  { slug: "apple-airtags-4-pack", affiliateUrl: "https://www.apple.com/airtag/" },
  { slug: "lego-botanicals-orchid", affiliateUrl: "https://www.lego.com/en-us/product/orchid-10311" },
  { slug: "ember-temperature-control-mug", affiliateUrl: "https://ember.com/products/ember-mug-2" },
  { slug: "theragun-mini", affiliateUrl: "https://www.therabody.com/us/en-us/theragun-mini.html" },
  { slug: "stanley-quencher-h2-0", affiliateUrl: "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz" },
  { slug: "aeropress-clear", affiliateUrl: "https://aeropress.com/products/aeropress-clear" },
  { slug: "patagonia-black-hole-duffel", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55l/49344.html" },
  { slug: "nintendo-switch-oled", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/" },
  { slug: "dyson-airwrap", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap" },
  { slug: "brooklinen-super-plush-robe", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robes" },
  { slug: "aura-frame", affiliateUrl: "https://auraframes.com/digital-frame/carver" },
  { slug: "lululemon-everywhere-belt-bag", affiliateUrl: "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag-1L/_/prod10050055" },
];

export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET || process.env.PRICE_SYNC_SECRET;
  if (cronSecret) {
    const auth = req.headers?.authorization;
    const querySecret = req.query?.secret;
    if (auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const itemsToSync = Array.isArray(req.body?.items) ? req.body.items : DEFAULT_ITEMS;
    const results = await syncCatalogBatch(itemsToSync, 3, 200);

    const updatedCount = results.filter((r) => r.status === "updated").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    res.status(200).json({
      ok: true,
      message: `Bulk catalog sync complete: ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed.`,
      stats: { total: results.length, updated: updatedCount, skipped: skippedCount, failed: failedCount },
      details: results,
    });
  } catch (error: any) {
    console.error("sync-all-prices cron error:", error);
    res.status(500).json({ error: error?.message ?? "Bulk price sync failed" });
  }
}
