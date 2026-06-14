import { NextRequest, NextResponse } from "next/server";

import { buildGiftBoxRecommendation } from "@/lib/gifting/concierge";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const relationship = String(body.relationship ?? "").trim();
  const occasion = String(body.occasion ?? "").trim();
  if (!relationship || !occasion) return NextResponse.json({ error: "Relationship and occasion are required." }, { status: 400 });

  const budgetDollars = Number(body.budget ?? 75);
  const box = buildGiftBoxRecommendation({
    recipientName: String(body.recipientName ?? "").trim(),
    relationship,
    occasion,
    interests: Array.isArray(body.interests) ? body.interests : String(body.interests ?? "").split(/,|\n/).map((v) => v.trim()).filter(Boolean),
    avoidTerms: Array.isArray(body.avoidTerms) ? body.avoidTerms : String(body.avoidTerms ?? "").split(/,|\n/).map((v) => v.trim()).filter(Boolean),
    budgetCents: Math.max(1500, Math.round((Number.isFinite(budgetDollars) ? budgetDollars : 75) * 100)),
    style: String(body.style ?? ""),
    surveyAnswers: String(body.surveyAnswers ?? ""),
    regenerationNote: String(body.regenerationNote ?? ""),
  });

  return NextResponse.json({ giftBox: box });
}
