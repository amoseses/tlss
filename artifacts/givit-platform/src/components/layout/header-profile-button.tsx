import { useLocation } from "wouter";
import { Link } from "wouter";
import { CircleUser } from "lucide-react";

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

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <CircleUser className="h-6 w-6" />
      </Link>
    );
  }

  const isAdmin = role === "admin";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
        <CircleUser className="h-6 w-6" />
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
            <DropdownMenuItem onClick={() => navigate("/gift")}>Givit AI</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
