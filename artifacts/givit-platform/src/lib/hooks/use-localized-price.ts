import { useEffect, useState } from "react";
import { SUPPORTED_REGIONS } from "@/lib/data/holidays";
import { useUserRegion } from "@/lib/hooks/use-user-region";
import { getExchangeRates, formatLocalizedEstimate } from "@/lib/currency";

// Returns a formatted "≈ €41" estimate string for a USD-cents price, or
// null when the shopper's region is the US (nothing to estimate) or a
// live rate isn't available for their currency. getExchangeRates() itself
// dedupes concurrent calls and caches for 12h, so mounting this in a whole
// grid of product cards costs one fetch, not one per card.
export function useLocalizedPrice(cents: number): string | null {
  const [region] = useUserRegion();
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    getExchangeRates().then((r) => { if (!cancelled) setRates(r); });
    return () => { cancelled = true; };
  }, []);

  const regionInfo = SUPPORTED_REGIONS.find((r) => r.code === region);
  if (!regionInfo) return null;
  const estimate = formatLocalizedEstimate(cents, regionInfo.currency, regionInfo.locale, rates);
  return estimate ? `≈ ${estimate}` : null;
}
