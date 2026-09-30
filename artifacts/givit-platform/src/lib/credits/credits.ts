// Client-side wrapper around the credits endpoints branched onto
// /api/metadata (see api/metadata.ts for why they live there, not at
// their own path -- Vercel Hobby-plan 12-function cap).

export type CreditStatus = {
  balance: number;
  freeAutogiftRemaining: number;
  freeAiRemaining: number;
};

export type SpendResult =
  | { ok: true; usedFree: boolean; balance: number }
  | { ok: false; usedFree: false; balance: number; error: "insufficient_credits" };

export async function getCreditStatus(): Promise<CreditStatus | null> {
  try {
    const res = await fetch("/api/metadata?action=credits");
    if (!res.ok) return null;
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
    const res = await fetch("/api/metadata?action=credits_spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason, referenceId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, usedFree: false, balance: data?.balance ?? 0, error: "insufficient_credits" };
    }
    return data;
  } catch {
    // Network failure: fail closed (block the action) rather than silently
    // letting a metered feature run for free.
    return { ok: false, usedFree: false, balance: 0, error: "insufficient_credits" };
  }
}
