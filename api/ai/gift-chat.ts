/// <reference path="../mjs-modules.d.ts" />
import { handleGiftChat } from "../_lib/handlers.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const result = await handleGiftChat(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "AI request failed" });
  }
}
