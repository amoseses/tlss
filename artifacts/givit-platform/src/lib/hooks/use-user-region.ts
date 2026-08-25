import { useState } from "react";
import { detectUserRegion, SUPPORTED_REGIONS } from "@/lib/data/holidays";

const STORAGE_KEY = "givit-region";

// One shared, persisted region preference -- previously the Calendar
// page's region picker was purely local state (useState, no storage),
// resetting to auto-detected on every reload and having no bearing on
// anything else. This is the same value the marketplace's localized-price
// estimate (lib/currency.ts) reads, so picking a region once on Calendar
// carries over everywhere else that cares about it.
export function useUserRegion() {
  const [region, setRegionState] = useState<string>(() => {
    if (typeof window === "undefined") return detectUserRegion();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED_REGIONS.some((r) => r.code === stored) ? stored : detectUserRegion();
  });

  function setRegion(code: string) {
    setRegionState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage can throw in private-browsing modes -- the in-memory
      // state above still updates fine, it just won't persist.
    }
  }

  return [region, setRegion] as const;
}
