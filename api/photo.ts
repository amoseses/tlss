/// <reference path="./mjs-modules.d.ts" />
import { resolveProductPhotoUrl } from "./_lib/photo.mjs";

export default async function handler(req: any, res: any) {
  const pageUrl = req.query?.url;
  if (!pageUrl || typeof pageUrl !== "string") {
    res.status(400).json({ error: "url query param is required" });
    return;
  }
  try {
    const imageUrl = await resolveProductPhotoUrl(pageUrl);
    if (!imageUrl) {
      res.status(404).end();
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.redirect(302, imageUrl);
  } catch {
    res.status(502).end();
  }
}
