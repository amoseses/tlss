import Link from "next/link";
import { Bell, Gift, Heart, Sparkles } from "lucide-react";

import { HeaderProfileButton } from "@/components/layout/header-profile-button";
import { HeaderSearch } from "@/components/layout/header-search";
import { SiteHeaderShell } from "@/components/layout/site-header-shell";
import { SiteNavMenu } from "@/components/layout/site-nav-menu";
import { MARKETPLACE_CATEGORIES } from "@/lib/data/marketplace";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";

type ProfileRow = {
  full_name: string | null;
  email: string;
  role: UserRole;
};

export async function SiteHeader() {
  const categories = MARKETPLACE_CATEGORIES;
  let user: { id: string } | null = null;
  let profile: ProfileRow | null = null;

  try {
    const supabase = await createClient();
    const auth = await supabase.auth.getUser();
    user = auth.data.user ? { id: auth.data.user.id } : null;

    if (auth.data.user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", auth.data.user.id)
        .single();
      if (data) profile = data as ProfileRow;
    }
  } catch {
    user = null;
    profile = null;
  }

  const isSeller = profile?.role === "admin";

  return (
    <SiteHeaderShell>
      <div className="bg-givit-ink text-white">
        <div className="container flex items-center gap-3 py-3 md:gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-givit-ember">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:block">
              GIV<span className="text-givit-coral">IT</span>
            </span>
          </Link>

          {/* Marketplace search */}
          <div className="hidden min-w-0 flex-1 md:flex">
            <HeaderSearch />
          </div>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/concierge"
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 md:flex"
            >
              <Bell className="h-4 w-4" /> AutoGift
            </Link>

            <Link
              href="/products"
              aria-label="Wishlist and marketplace"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <Heart className="h-5 w-5" />
            </Link>

            <HeaderProfileButton
              loggedIn={Boolean(user && profile)}
              email={profile?.email}
              displayName={profile?.full_name ?? undefined}
              role={profile?.role}
            />

            {isSeller ? (
              <Button
                asChild
                size="sm"
                className="hidden h-8 rounded-full bg-givit-ember px-3 text-xs font-semibold text-white hover:bg-givit-ember-hover lg:inline-flex"
              >
                <Link href="/admin">Admin Products</Link>
              </Button>
            ) : null}

            {profile?.role === "admin" ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden h-8 rounded-full border-white/20 bg-transparent px-3 text-xs font-semibold text-white hover:bg-white/10 lg:inline-flex"
              >
                <Link href="/manager">Manager</Link>
              </Button>
            ) : null}

            <SiteNavMenu
              categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
              isSeller={isSeller}
            />
          </div>
        </div>

        {/* Category bar — subtle secondary bar */}
        <div className="border-t border-white/8 bg-white/5">
          <div className="container flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              href="/gift"
              className="shrink-0 ml-auto flex items-center gap-1 rounded-full bg-givit-ember/20 border border-givit-coral/30 px-3 py-1 text-xs font-semibold text-givit-coral transition-colors hover:bg-givit-ember/30 whitespace-nowrap"
            >
              <Sparkles className="h-3 w-3" />
              Givit AI
            </Link>
          </div>
        </div>
      </div>
    </SiteHeaderShell>
  );
}
