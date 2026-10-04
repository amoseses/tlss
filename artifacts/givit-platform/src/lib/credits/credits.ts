// Client-side wrapper around the credits endpoints branched onto
// /api/metadata (see api/metadata.ts for why they live there, not at
// their own path -- Vercel Hobby-plan 12-function cap).
import { createClient } from "@/lib/supabase/client";

export type CreditStatus = {
  balance: number;
  freeAutogiftRemaining: number;
  freeAutogiftLimit: number;
  freeAiRemaining: number;
  freeAiLimit: number;
};

// "unavailable" = we couldn't reach/verify the ledger at all (network,
// server misconfig, signed out) -- distinct from a real empty balance so
// the UI doesn't tell someone with credits that they're out.
export type SpendResult =
  | { ok: true; usedFree: boolean; balance: number }
  | { ok: false; usedFree: false; balance: number; error: "insufficient_credits" | "unavailable" };

// Display copy for the packs; prices/credit counts are authoritative in
// CREDIT_PACKS in server/api-lib/credits.mjs -- keep the two in sync.
export const CREDIT_PACKS = [
  { id: "starter", label: "Starter", credits: 20, priceCents: 599 },
  { id: "standard", label: "Standard", credits: 45, priceCents: 1099 },
] as const;
export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

// Fired after anything that changes the balance (a spend, a purchase) so
// the header badge can refetch instead of showing a stale number until
// the next full page load.
export const CREDITS_CHANGED_EVENT = "givit:credits-changed";
function notifyCreditsChanged() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}

// getUserFromRequest (server/api-lib/auth.mjs) reads the caller's identity
// from an Authorization: Bearer <token> header -- it does NOT read
// cookies. A plain fetch() with no headers always comes back 401, which
// is why the credit badge looked "broken" (silently returned null) even
// once it started actually making the request. Mirrors authedFetch() in
// autogift-onboarding-wizard.tsx.
async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export async function getCreditStatus(): Promise<CreditStatus | null> {
  try {
    const res = await authedFetch("/api/metadata?action=credits");
    if (!res || !res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Spends a credit for a metered action. Call this BEFORE running the
// actual action (sending the AI message, running the match, placing the
// order) -- never after, so a user never gets charged for something that
// then fails, and never gets the AI output for free because the spend
// check happened too late.
export async function spendCredit(reason: "gift_ai_chat" | "secret_santa_match" | "autogift_purchase", amount: number, referenceId?: string): Promise<SpendResult> {
  try {
    const res = await authedFetch("/api/metadata?action=credits_spend", {
      method: "POST",
      body: JSON.stringify({ amount, reason, referenceId }),
    });
    if (!res) {
      return { ok: false, usedFree: false, balance: 0, error: "unavailable" };
    }
    const data = await res.json().catch(() => null);
    // Only a 402 means "really out of credits"; a 500 means the ledger
    // itself failed, which the user can't fix by buying more.
    if (res.status === 402) {
      return { ok: false, usedFree: false, balance: data?.balance ?? 0, error: "insufficient_credits" };
    }
    if (!res.ok || !data?.ok) {
      return { ok: false, usedFree: false, balance: data?.balance ?? 0, error: "unavailable" };
    }
    notifyCreditsChanged();
    return data;
  } catch {
    // Network failure: fail closed (block the action) rather than silently
    // letting a metered feature run for free.
    return { ok: false, usedFree: false, balance: 0, error: "unavailable" };
  }
}

// Sends the browser to Stripe's hosted Checkout. Resolves with an error
// message only if it couldn't get there.
export async function startCreditCheckout(packId: CreditPackId): Promise<string | null> {
  try {
    const res = await authedFetch("/api/metadata?action=credits_checkout", {
      method: "POST",
      body: JSON.stringify({ packId }),
    });
    if (!res) return "Sign in to buy credits.";
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) return data?.error || "Couldn't start checkout -- try again.";
    window.location.assign(data.url);
    return null;
  } catch {
    return "Couldn't start checkout -- check your connection and try again.";
  }
}

export type ConfirmPurchaseResult =
  | { ok: true; alreadyGranted: boolean; creditsGranted?: number; balance?: number }
  | { ok: false; status?: string; error?: string };

export async function confirmCreditPurchase(sessionId: string): Promise<ConfirmPurchaseResult> {
  try {
    const res = await authedFetch("/api/metadata?action=credits_confirm", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    if (!res) return { ok: false, error: "Sign in to finish your purchase." };
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error };
    if (data?.ok) notifyCreditsChanged();
    return data;
  } catch {
    return { ok: false, error: "Couldn't confirm that purchase -- refresh to try again." };
  }
}
