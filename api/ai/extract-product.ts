/// <reference path="../mjs-modules.d.ts" />
import { extractProductWithAI } from "../_lib/extract-product.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const url = req.body?.url;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  try {
    const result = await extractProductWithAI(url);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "AI extraction failed" });
  }
}
