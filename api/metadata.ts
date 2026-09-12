/// <reference path="./mjs-modules.d.ts" />
import { fetchPageMetadata } from "../server/api-lib/metadata.mjs";
import { collectEtsyProductRows } from "../server/api-lib/etsy.mjs";
import { getUserFromRequest } from "../server/api-lib/auth.mjs";
import { restFetch } from "../server/api-lib/supabase-rest.mjs";

const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// POST ?action=etsy_sync = admin-only: pulls a fresh batch of real Etsy
// listings into the `products` table (see server/api-lib/etsy.mjs for the
// category/keyword mapping and row shape). Branched onto this existing
// endpoint for the same Hobby-plan 12-function-cap reason called out on
// the Groq branch below -- admin-triggered, not a cron, so it doesn't need
// one of the 2 cron slots either.
async function handleEtsySync(req: any, res: any) {
  try {
    const admin = await getUserFromRequest(req);
    if (!admin) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const adminRows = await restFetch(`profiles?id=eq.${admin.id}&select=role`);
    if (adminRows?.[0]?.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const { rows, errors } = await collectEtsyProductRows();
    if (rows.length > 0) {
      await restFetch(`products?on_conflict=slug`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      });
    }
    res.status(200).json({ synced: rows.length, errors });
  } catch (error: any) {
    console.error("Etsy sync failed:", error?.message);
    res.status(502).json({ error: error?.message || "Etsy sync failed." });
  }
}

// Branched onto this existing endpoint rather than living at its own
// api/groq.ts -- this project sits at Vercel's Hobby-plan 12-function cap
// (see the SMS-inbound webhook branched onto api/cron/dispatch-notifications.ts
// for the same reason). No collision risk: every caller of GET /api/metadata
// sends a `url` query param, and the Groq client (src/lib/ai/groq-client.ts)
// always POSTs a JSON body, so splitting on req.method is unambiguous.
async function handleGroqChat(req: any, res: any) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      return;
    }

    const { messages, temperature = 0.7, maxTokens = 700, model = GROQ_DEFAULT_MODEL } = req.body ?? {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages must be an array" });
      return;
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data });
      return;
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "POST" && req.query?.action === "etsy_sync") {
    await handleEtsySync(req, res);
    return;
  }

  if (req.method === "POST") {
    await handleGroqChat(req, res);
    return;
  }

  const pageUrl = req.query?.url;
  if (!pageUrl || typeof pageUrl !== "string") {
    res.status(400).json({ error: "url query param is required" });
    return;
  }
  try {
    const meta = await fetchPageMetadata(pageUrl);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).json({ data: meta });
  } catch {
    res.status(502).json({ data: null });
  }
}
