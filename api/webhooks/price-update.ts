/// <reference path="../mjs-modules.d.ts" />
import { updateProductPrice } from "../../server/api-lib/price-update.mjs";

function parsePriceToCents(val: any): number | null {
  if (typeof val === "number") {
    // If integer over 500, assume it's already in cents (e.g., 34999 = $349.99).
    // If small number with decimals (e.g., 349.99), multiply by 100.
    if (Number.isInteger(val) && val > 500) return val;
    return Math.round(val * 100);
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) || num <= 0 ? null : Math.round(num * 100);
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // Handle health check / verification GET request
  if (req.method === "GET") {
    res.status(200).json({ ok: true, service: "GIVIT Price Sync Webhook", status: "active" });
    return;
  }

  // Authentication check (optional secret validation)
  const secret = process.env.PRICE_SYNC_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers?.authorization;
    const querySecret = req.query?.secret;
    const tokenValid = authHeader === `Bearer ${secret}` || querySecret === secret;
    if (!tokenValid) {
      res.status(401).json({ error: "Unauthorized: Invalid PRICE_SYNC_SECRET token." });
      return;
    }
  }

  const body = req.body ?? {};

  // Extract flexible fields sent by changedetection.io webhooks or custom tools
  const url = body.url || body.url_watched || body.product_url || body.target_url || req.query?.url;
  const productId = body.product_id || body.productId || body.id;
  const slug = body.slug;

  const rawPrice = body.price || body.current_price || body.price_cents || body.snapshot || body.price_text;
  const rawSalePrice = body.sale_price || body.sale_price_cents;

  const priceCents = parsePriceToCents(rawPrice);
  const salePriceCents = parsePriceToCents(rawSalePrice);

  if (!priceCents) {
    res.status(400).json({
      error: "Missing or unparseable price field. Send 'price' as string ($29.99) or number (2999).",
      receivedBody: body,
    });
    return;
  }

  if (!url && !productId && !slug) {
    res.status(400).json({
      error: "Missing product identifier. Send 'url', 'product_id', or 'slug'.",
      receivedBody: body,
    });
    return;
  }

  try {
    const result = await updateProductPrice({
      url: typeof url === "string" ? url : undefined,
      productId: typeof productId === "string" ? productId : undefined,
      slug: typeof slug === "string" ? slug : undefined,
      priceCents,
      salePriceCents: salePriceCents ?? undefined,
      currency: typeof body.currency === "string" ? body.currency : "USD",
    });

    res.status(200).json({ ok: true, message: "Price updated successfully", ...result });
  } catch (error: any) {
    console.error("Price sync webhook error:", error);
    res.status(500).json({ error: error?.message ?? "Price sync failed" });
  }
}
