import { recommendGifts, OCCASION_WORDS, RECIPIENT_KEYWORDS, type GiftRecommendResult, type LearningProfile } from "@/lib/gift-recommend";
import type { MarketplaceProduct } from "@/lib/data/marketplace";

export type SavedRecipientLike = {
  id: string;
  name: string;
  relationship?: string | null;
  interests?: string[] | null;
  avoid_terms?: string[] | null;
};

export type ParsedBatchRequest = {
  names: string[];
  budgetCents: number;
  mode: "total" | "each";
  occasion: string | null;
};

export type BatchGiftEntry = {
  name: string;
  recipient?: SavedRecipientLike;
  budgetCents: number;
  results: GiftRecommendResult[];
};

export type BatchGiftPlan = {
  totalBudgetCents: number;
  mode: "total" | "each";
  occasion: string | null;
  entries: BatchGiftEntry[];
};

function extractNameSegment(query: string): string | null {
  const forMatch = query.match(/\b(?:gifts?|presents?|shopping)\s+for\s+(.+)/i);
  if (!forMatch) return null;
  let segment = forMatch[1];
  segment = segment.split(/\$\d|\b\d+\s*(?:dollars?|bucks?)\b/i)[0];
  segment = segment.split(new RegExp(`\\b(?:total|combined|altogether|budget|occasion|${OCCASION_WORDS})\\b`, "i"))[0];
  segment = segment.split(/\b(?:loves?|likes?|enjoys?|into|interested in|who|that|which|avoid(?:ing|s)?)\b/i)[0];
  return segment.trim().replace(/[.,;:]+$/, "") || null;
}

function splitNames(segment: string): string[] {
  return segment
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s*&\s*/i)
    .map((s) => s.trim().replace(/^(my|our|an?|the)\s+/i, "").trim())
    .filter((s) => s.length > 0 && s.length < 40);
}

function extractBudget(query: string): { cents: number; mode: "total" | "each" } | null {
  const each = query.match(/\$?(\d+)\s*(?:dollars?|bucks?)?\s*each\b/i);
  if (each) return { cents: Number.parseInt(each[1], 10) * 100, mode: "each" };
  const amount = query.match(/\$(\d+)/) ?? query.match(/(\d+)\s*(?:dollars?|bucks?)\b/i);
  if (amount) return { cents: Number.parseInt(amount[1], 10) * 100, mode: "total" };
  return null;
}

function extractOccasion(query: string): string | null {
  const match = query.match(new RegExp(`\\b(${OCCASION_WORDS})\\b`, "i"));
  return match?.[1] ?? null;
}

function matchSavedRecipient(name: string, saved: SavedRecipientLike[]): SavedRecipientLike | undefined {
  const lower = name.toLowerCase();
  return saved.find((r) => r.name.trim().toLowerCase() === lower) ?? saved.find((r) => r.relationship?.trim().toLowerCase() === lower);
}

const RECIPIENT_KEYWORD_PATTERN = new RegExp(`\\b(?:${RECIPIENT_KEYWORDS.join("|")})\\b`, "i");

function isPlausibleRecipientName(name: string, saved: SavedRecipientLike[]): boolean {
  if (/^[A-Z]/.test(name)) return true;
  if (RECIPIENT_KEYWORD_PATTERN.test(name)) return true;
  return Boolean(matchSavedRecipient(name, saved));
}

export function parseBatchGiftRequest(query: string, savedRecipients: SavedRecipientLike[] = []): ParsedBatchRequest | null {
  const segment = extractNameSegment(query);
  if (!segment) return null;
  const seen = new Set<string>();
  const names = splitNames(segment).filter((n) => {
    const lower = n.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
  if (names.length < 2) return null;
  if (!names.every((n) => isPlausibleRecipientName(n, savedRecipients))) return null;
  const budget = extractBudget(query);
  if (!budget || budget.cents <= 0) return null;
  return { names, budgetCents: budget.cents, mode: budget.mode, occasion: extractOccasion(query) };
}

function splitEvenlyCents(totalCents: number, n: number): number[] {
  const totalDollars = Math.round(totalCents / 100);
  const base = Math.floor(totalDollars / n);
  const remainder = totalDollars - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) * 100);
}

function buildEntryQuery(name: string, recipient: SavedRecipientLike | undefined, budgetCents: number, occasion: string | null): string {
  const parts = [`Gift for ${recipient?.name ?? name}${recipient?.relationship ? ` (${recipient.relationship})` : ""}`];
  if (occasion) parts.push(occasion);
  parts.push(`budget $${Math.round(budgetCents / 100)}`);
  if (recipient?.interests?.length) parts.push(`loves ${recipient.interests.join(", ")}`);
  if (recipient?.avoid_terms?.length) parts.push(`avoid ${recipient.avoid_terms.join(", ")}`);
  return parts.join(", ");
}

export function runBatchGiftSearch(
  parsed: ParsedBatchRequest,
  savedRecipients: SavedRecipientLike[],
  learningProfile: LearningProfile,
  catalog: MarketplaceProduct[],
): BatchGiftPlan {
  const n = parsed.names.length;
  const perPersonCents = parsed.mode === "each" ? Array.from({ length: n }, () => parsed.budgetCents) : splitEvenlyCents(parsed.budgetCents, n);

  const entries: BatchGiftEntry[] = parsed.names.map((name, i) => {
    const recipient = matchSavedRecipient(name, savedRecipients);
    const budgetCents = perPersonCents[i];
    const query = buildEntryQuery(name, recipient, budgetCents, parsed.occasion);
    const { results } = recommendGifts(query, learningProfile, 3, { catalog });
    return { name, recipient, budgetCents, results };
  });

  return {
    totalBudgetCents: parsed.mode === "each" ? parsed.budgetCents * n : parsed.budgetCents,
    mode: parsed.mode,
    occasion: parsed.occasion,
    entries,
  };
}
