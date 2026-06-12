"use client";

import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CategoryItem = { id: string; name: string; slug: string };

type Props = {
  categories: CategoryItem[];
  isSeller?: boolean;
};

export function SiteNavMenu({ categories, isSeller }: Props) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <Menu className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="font-serif text-base">Browse</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/products")}>Marketplace</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/boards")}>
          Gift Boards
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/concierge")}>AutoGift</DropdownMenuItem>
        {categories.length > 0 ? <DropdownMenuSeparator /> : null}
        {categories.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => router.push(`/products?category=${encodeURIComponent(c.slug)}`)}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/feedback")}>Feedback</DropdownMenuItem>
        {isSeller ? (
          <DropdownMenuItem onClick={() => router.push("/admin")}>Admin Products</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => router.push("/gift")}>
            Givit AI
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
