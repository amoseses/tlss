import Link from "next/link";

import { Gift, Palette } from "lucide-react";

type CategoryItem = { id: string; name: string; slug: string };

type Props = {
  categories: CategoryItem[];
  isSeller?: boolean;
  isAdmin?: boolean;
};

export function HeaderCategoryBar({ categories, isSeller, isAdmin }: Props) {
  return (
    <nav
      aria-label="Categories"
      className="border-t border-white/10 bg-givit-ink-secondary text-sm text-white"
    >
      <div className="container flex items-center gap-4 overflow-x-auto py-2.5 whitespace-nowrap">
        <Link href="/products" className="shrink-0 font-semibold hover:text-givit-ember">
          Marketplace
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${encodeURIComponent(c.slug)}`}
            className="shrink-0 hover:text-givit-ember"
          >
            {c.name}
          </Link>
        ))}
        <Link href="/products?q=gift" className="flex shrink-0 items-center gap-1 hover:text-givit-ember">
          <Gift className="h-3.5 w-3.5" />
          Gift Search
        </Link>
        <Link href="/products?q=artisan" className="flex shrink-0 items-center gap-1 hover:text-givit-ember">
          <Palette className="h-3.5 w-3.5" />
          Gift Boards
        </Link>
        <span className="mx-1 hidden h-4 w-px shrink-0 bg-white/20 sm:block" />
        <Link href="/feedback" className="shrink-0 hover:text-givit-ember">
          Feedback
        </Link>
        {isSeller ? (
          <Link href="/admin" className="shrink-0 text-givit-ember hover:underline">
            Admin Products
          </Link>
        ) : (
          <Link href="/gift" className="shrink-0 hover:text-givit-ember">
            Givit AI
          </Link>
        )}
        {isAdmin ? (
          <Link href="/manager" className="shrink-0 text-givit-ember hover:underline">
            Manager Console
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
