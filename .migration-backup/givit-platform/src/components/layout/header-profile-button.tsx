"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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

  const isStaff = role === "admin";
  const isAdmin = role === "admin";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <CircleUser className="h-6 w-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{displayName || "Account"}</p>
          {email ? <p className="text-muted-foreground text-xs">{email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/account")}>Account</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/orders")}>Orders</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/products")}>Wishlist</DropdownMenuItem>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/manager")}>
              Manager console
            </DropdownMenuItem>
          </>
        ) : null}
        {isStaff ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin")}>Admin products</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/gift")}>
              Givit AI
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
