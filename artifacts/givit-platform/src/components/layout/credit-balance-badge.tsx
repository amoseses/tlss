import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Coins } from "lucide-react";

import { getCreditStatus, type CreditStatus } from "@/lib/credits/credits";

// Small persistent balance indicator, same idea as the existing bell/
// notification icon -- always visible, not buried in a menu, since the
// whole point of showing it is that people see the cost before they act,
// not discover it mid-action.
export function CreditBalanceBadge({ isDark }: { isDark: boolean }) {
  const [status, setStatus] = useState<CreditStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCreditStatus().then((s) => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, []);

  if (!status) return null;

  return (
    <Link
      href="/account"
      title={`${status.balance} credits • ${status.freeAiRemaining} free AI actions left this year`}
      className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors ${
        isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-givit-sand/60 text-givit-ink hover:bg-givit-sand"
      }`}
    >
      <Coins className="h-3.5 w-3.5 text-givit-ember" />
      {status.balance}
    </Link>
  );
}
