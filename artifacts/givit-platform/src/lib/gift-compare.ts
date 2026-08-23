import type { MarketplaceProduct } from "@/lib/data/marketplace";

export type CompareVerdict = { winner: "a" | "b" | "tie"; reasoning: string };

const COMPARE_PATTERNS: RegExp[] = [
  /\bcompare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+)/i,
  /\bwhich(?:'s| is) better,?\s+(.+?)\s+or\s+(.+)/i,
  /^(.+?)\s+vs\.?\s+(.+)$/i,
];

export function parseCompareRequest(query: string): [string, string] | null {
  const trimmed = query.trim();
  for (const pattern of COMPARE_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m?.[1] && m?.[2]) {
      const a = m[1].trim().replace(/[?.!]+$/, "");
      const b = m[2].trim().replace(/\bfor\s+\S.*$/i, "").trim().replace(/[?.!]+$/, "");
      if (a && b) return [a, b];
    }
  }
  return null;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

export function findBestProductMatch(fragment: string, catalog: MarketplaceProduct[]): MarketplaceProduct | null {
  const tokens = tokenize(fragment);
  if (tokens.length === 0) return null;
  let best: { product: MarketplaceProduct; score: number } | null = null;
  for (const product of catalog) {
    const nameTokens = tokenize(product.name);
    const nameTokenSet = new Set(nameTokens);
    const overlap = tokens.filter((t) => nameTokenSet.has(t)).length;
    if (overlap === 0) continue;
    const score = overlap / Math.max(tokens.length, nameTokens.length);
    if (!best || score > best.score) best = { product, score };
  }
  return best && best.score >= 0.3 ? best.product : null;
}

export function compareDeterministic(a: MarketplaceProduct, b: MarketplaceProduct, recipientInterests: string[]): CompareVerdict {
  const interestOverlap = (p: MarketplaceProduct) => p.interests.filter((i) => recipientInterests.includes(i)).length;
  const scoreOf = (p: MarketplaceProduct) => interestOverlap(p) * 10 + p.gift_match_score / 10;
  const scoreA = scoreOf(a);
  const scoreB = scoreOf(b);

  if (Math.abs(scoreA - scoreB) < 1) {
    return { winner: "tie", reasoning: `${a.name} and ${b.name} are close — both are solid picks, so it likely comes down to personal taste here.` };
  }
  const [winner, winnerProduct, loserProduct] = scoreA > scoreB ? ["a" as const, a, b] : ["b" as const, b, a];
  const overlap = interestOverlap(winnerProduct);
  const reason = overlap > 0
    ? `${winnerProduct.name} lines up better with what they're into — it touches on ${winnerProduct.interests.filter((i) => recipientInterests.includes(i)).slice(0, 2).join(" and ")}, which ${loserProduct.name} doesn't.`
    : `${winnerProduct.name} edges it out on overall gift fit and reviews.`;
  return { winner, reasoning: reason };
}
