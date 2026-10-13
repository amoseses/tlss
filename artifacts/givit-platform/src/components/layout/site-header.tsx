import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Bell, CalendarDays, Gift, LayoutGrid, Sparkles, UserRound } from "lucide-react";

import { HeaderProfileButton } from "@/components/layout/header-profile-button";
import { CreditBalanceBadge } from "@/components/layout/credit-balance-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth/use-auth";

// Your Gift AI leads and is the only filled item: it's the product now,
// not one tab among equals. Marketplace sits last and muted on purpose --
// a ~200-item catalog can't win on selection, so it's a place to wander
// rather than the front door.
const NAV_ITEMS = [
  { href: "/gift", label: "Your Gift AI", icon: Sparkles, primary: true },
  { href: "/home", label: "Dashboard", icon: LayoutGrid },
  { href: "/people", label: "People", icon: UserRound },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  // Previously only reachable from a panel on /account -- easy to never
  // notice unless you already knew it existed. It's a standalone group
  // feature (not tied to any other nav item here), so it earns its own
  // top-level spot rather than staying buried a click deeper.
  { href: "/secret-santa", label: "Secret Santa", icon: Gift },
  { href: "/concierge", label: "AutoGift", icon: Bell, accent: true },
  { href: "/products", label: "Marketplace", icon: null, muted: true },
];

export function SiteHeader() {
  const { user, profile } = useAuth();
  const [location] = useLocation();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";
  const isSeller = profile?.role === "admin";

  const [path, search] = location.split("?");

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className={isDark ? "bg-black text-white" : "bg-white text-givit-ink border-b border-border"}>
        <div className="container flex items-center justify-between gap-3 py-2.5 md:py-3">
          <Link href="/home" className="shrink-0 flex items-center gap-2">
            <img src="/Screenshot 2026-06-23 095149.png" alt="GIVIT" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:block">
              GIVIT
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? <CreditBalanceBadge isDark={isDark} /> : null}
            <ThemeToggle />
            <HeaderProfileButton
              loggedIn={Boolean(user && profile)}
              email={profile?.email}
              displayName={profile?.full_name ?? undefined}
              role={profile?.role}
              avatarUrl={profile?.avatar_url}
            />

            {isSeller ? (
              <Link
                href="/admin"
                className="hidden h-8 items-center rounded-md bg-givit-ember px-3 text-xs font-semibold text-white hover:bg-givit-ember-hover lg:flex"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </div>

        <div className={isDark ? "border-t border-white/8 bg-white/5" : "border-t border-border bg-givit-sand/40"}>
          <div className="container flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
            {NAV_ITEMS.map((item) => {
              const [itemPath] = item.href.split("?");
              const isActive = path === itemPath;
              const Icon = item.icon;
              const isAutoGift = item.accent;
              const isPrimary = item.primary;
              const isMuted = item.muted;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                    isPrimary
                      ? "bg-givit-ember text-white shadow-sm hover:bg-givit-ember-hover"
                      : isMuted
                      ? isActive
                        ? isDark
                          ? "bg-white/15 text-white"
                          : "bg-givit-ember/15 text-givit-ember"
                        : isDark
                          ? "text-white/45 hover:bg-white/10 hover:text-white/80"
                          : "text-givit-ink/45 hover:bg-white hover:text-givit-ink/80"
                    : isAutoGift
                      ? isActive
                        ? "bg-givit-ember text-white"
                        : "border border-givit-ember/40 text-givit-ember hover:bg-givit-ember/10"
                      : isActive
                        ? isDark
                          ? "bg-white/15 text-white"
                          : "bg-givit-ember/15 text-givit-ember"
                        : isDark
                          ? "text-white/80 hover:bg-white/10 hover:text-white"
                          : "text-givit-ink/70 hover:bg-white hover:text-givit-ink"
                  }`}
                >
                  {Icon && <Icon className="mr-1 inline h-3.5 w-3.5" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
