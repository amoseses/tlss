// Every price in the catalog is stored in USD cents and Stripe charges in
// USD regardless of where the shopper is -- this never touches that. It's
// a display-only "about how much that is in your currency" estimate,
// always rendered as a secondary line prefixed with "≈", never replacing
// the real USD price. Silently shows nothing (falls back to USD-only) if
// a rate isn't available, rather than guessing.
// Frankfurter.app (the other well-known free/no-key option) doesn't send
// CORS headers, so a direct browser fetch fails outright -- confirmed by
// testing it live, not assumed. open.er-api.com does allow cross-origin
// requests and needs no key either.
const FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "givit-fx-rates-v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h -- ECB reference rates only update once a day anyway

type RateCache = { rates: Record<string, number>; fetchedAt: number };

let inFlight: Promise<Record<string, number>> | null = null;

function readCache(): RateCache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.fetchedAt === "number" && parsed.rates) return parsed;
  } catch {
    // corrupt cache, ignore
  }
  return null;
}

function writeCache(rates: Record<string, number>) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() } satisfies RateCache));
  } catch {
    // storage full or unavailable -- rates just won't be cached this session
  }
}

// Returns USD->currency rates. Fetches at most once per TTL window (shared
// across every price on the page via the in-flight promise + localStorage
// cache), falls back to a stale cache on network failure rather than
// showing nothing, and resolves to {} (no conversions available) only if
// there's truly nothing to fall back on.
export async function getExchangeRates(): Promise<Record<string, number>> {
  if (typeof window === "undefined") return {};
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rates;

  if (!inFlight) {
    inFlight = fetch(FX_ENDPOINT)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`FX fetch failed (${res.status})`))))
      .then((data: { result?: string; rates?: Record<string, number> }) => {
        if (data.result !== "success" || !data.rates) throw new Error("FX response missing rates");
        const rates = { ...data.rates, USD: 1 };
        writeCache(rates);
        return rates;
      })
      .catch((error) => {
        console.warn("currency: exchange rate fetch failed, falling back to cache if any", error);
        return cached?.rates ?? {};
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function convertFromUsdCents(cents: number, targetCurrency: string, rates: Record<string, number>): number | null {
  if (!Number.isFinite(cents)) return null;
  if (targetCurrency === "USD") return null; // nothing to estimate, USD is already the real price
  const rate = rates[targetCurrency];
  if (!rate) return null;
  return Math.round(cents * rate);
}

export function formatLocalizedEstimate(cents: number, currency: string, locale: string, rates: Record<string, number>): string | null {
  const converted = convertFromUsdCents(cents, currency, rates);
  if (converted == null) return null;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(converted / 100);
  } catch {
    return null; // an unrecognized currency/locale pair -- fail closed, no estimate shown
  }
}
