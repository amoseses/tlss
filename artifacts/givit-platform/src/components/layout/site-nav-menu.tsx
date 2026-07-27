import { useLocation } from "wouter";
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
  const [, navigate] = useLocation();

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
        <DropdownMenuItem onClick={() => navigate("/products")}>Marketplace</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/boards")}>Gift Boards</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/concierge")}>AutoGift</DropdownMenuItem>
        {categories.length > 0 ? <DropdownMenuSeparator /> : null}
        {categories.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => navigate(`/products?category=${encodeURIComponent(c.slug)}`)}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/feedback")}>Feedback</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/beta-tester-survey")}>Beta tester survey</DropdownMenuItem>
        {isSeller ? (
          <DropdownMenuItem onClick={() => navigate("/admin")}>Admin Products</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => navigate("/gift")}>Your Gift AI</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
