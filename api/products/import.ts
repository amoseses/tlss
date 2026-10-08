/// <reference path="../mjs-modules.d.ts" />

import { importProductFromUrl } from "../../server/api-lib/product-import.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      error: "Method not allowed",
    });
    return;
  }

  try {
    const { url } = req.body ?? {};

    if (!url || typeof url !== "string") {
      res.status(400).json({
        error: "url is required",
      });
      return;
    }

    const result = await importProductFromUrl(url);

    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error: any) {
    console.error("Product import error:", error);

    res.status(500).json({
      error:
        error?.message ||
        "Failed to import product.",
    });
  }
}