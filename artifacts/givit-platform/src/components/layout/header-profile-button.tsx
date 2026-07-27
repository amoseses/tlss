import { useLocation } from "wouter";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { CircleUser } from "lucide-react";
import { generatedProfilePhotoUrl } from "@/lib/avatar";

import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types/database";

type Props = {
  loggedIn: boolean;
  email?: string;
  displayName?: string;
  role?: UserRole;
};

export function HeaderProfileButton({ loggedIn, email, displayName, role }: Props) {
  const [, navigate] = useLocation();
  // The header's own background now flips light/dark with the theme (it
  // used to always be black), so this icon/button needs to track it too --
  // hardcoded white text would go invisible on a white header in light mode.
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const iconClass = isDark ? "text-white hover:bg-white/10" : "text-givit-ink hover:bg-black/5";

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${iconClass}`}
      >
        <CircleUser className="h-6 w-6" />
      </Link>
    );
  }

  const isAdmin = role === "admin";
  const avatarUrl = generatedProfilePhotoUrl(email || displayName);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${iconClass}`}>
        <img src={avatarUrl} alt={displayName || email || "Account"} className={`h-8 w-8 rounded-full bg-white object-cover ring-2 ${isDark ? "ring-white/30" : "ring-black/10"}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{displayName || "Account"}</p>
          {email ? <p className="text-muted-foreground text-xs">{email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/account")}>Account</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/orders")}>Orders</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/products")}>Wishlist</DropdownMenuItem>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/manager")}>Manager console</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin")}>Admin products</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/people")}>People</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/concierge")}>AutoGift</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
