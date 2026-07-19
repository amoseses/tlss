import { Link } from "wouter";
import { Bell, LayoutGrid, Sparkles, UserRound } from "lucide-react";

import { HeaderProfileButton } from "@/components/layout/header-profile-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth/use-auth";

export function SiteHeader() {
  const { user, profile } = useAuth();
  const isSeller = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className="bg-black text-white">
        <div className="container flex items-center justify-between gap-3 py-2.5 md:py-3">
          <Link href="/home" className="shrink-0 flex items-center gap-2">
            <img src="/Screenshot 2026-06-23 095149.png" alt="Givit" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:block">
              GIV<span className="text-givit-coral">IT</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <HeaderProfileButton
              loggedIn={Boolean(user && profile)}
              email={profile?.email}
              displayName={profile?.full_name ?? undefined}
              role={profile?.role}
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

        <div className="border-t border-white/8 bg-white/5">
          <div className="container flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            <Link
              href="/home"
              className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
            >
              <LayoutGrid className="mr-1 inline h-3 w-3" />
              Dashboard
            </Link>
            <Link
              href="/people"
              className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
            >
              <UserRound className="mr-1 inline h-3 w-3" />
              People
            </Link>
            <Link
              href="/gift"
              className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-givit-ember transition-colors hover:bg-white/10 hover:text-givit-ember-hover whitespace-nowrap"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              AI Assistant
            </Link>
            <Link
              href="/products"
              className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
            >
              Marketplace
            </Link>
            <Link
              href="/concierge"
              className="shrink-0 rounded-md px-3 py-1 text-xs font-medium text-givit-coral transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
            >
              <Bell className="mr-1 inline h-3 w-3" />
              AutoGift
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
