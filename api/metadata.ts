/// <reference path="./mjs-modules.d.ts" />
import { fetchPageMetadata } from "../server/api-lib/metadata.mjs";
import { syncEtsyProducts } from "../server/api-lib/etsy.mjs";
import { getUserFromRequest } from "../server/api-lib/auth.mjs";
import { restFetch } from "../server/api-lib/supabase-rest.mjs";
import { getCreditStatus, spendCredits } from "../server/api-lib/credits.mjs";

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

    const { synced, errors } = await syncEtsyProducts();
    res.status(200).json({ synced, errors });
  } catch (error: any) {
    console.error("Etsy sync failed:", error?.message);
    res.status(502).json({ error: error?.message || "Etsy sync failed." });
  }
}

// GET ?action=credits = this user's current balance + free-tier remaining.
// POST ?action=credits_spend = the single gate every metered feature
// (Your Gift AI, Secret Santa matching, AutoGift) calls through before it
// runs the actual action -- see credit-system-proposal.md. Branched onto
// this existing endpoint for the same Hobby-plan 12-function-cap reason
// as etsy_sync and the Groq branch below.
async function handleCreditStatus(req: any, res: any) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const status = await getCreditStatus(user.id);
    res.status(200).json(status);
  } catch (error: any) {
    console.error("Credit status failed:", error?.message);
    res.status(500).json({ error: "Couldn't load credit balance." });
  }
}

async function handleCreditSpend(req: any, res: any) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const { amount, reason, referenceId } = req.body ?? {};
    const VALID_REASONS = new Set(["autogift_purchase", "gift_ai_chat", "secret_santa_match"]);
    if (!VALID_REASONS.has(reason) || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Invalid spend request." });
      return;
    }
    const result = await spendCredits(user.id, amount, reason, typeof referenceId === "string" ? referenceId : null);
    if (!result?.ok) {
      res.status(402).json(result ?? { error: "insufficient_credits" });
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Credit spend failed:", error?.message);
    res.status(500).json({ error: "Couldn't process that -- try again." });
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

  if (req.method === "POST" && req.query?.action === "credits_spend") {
    await handleCreditSpend(req, res);
    return;
  }

  if (req.method === "GET" && req.query?.action === "credits") {
    await handleCreditStatus(req, res);
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
