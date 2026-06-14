import { Link } from "wouter";
import { MARKETPLACE_CATEGORIES } from "@/lib/data/marketplace";

export function HeaderCategoryBar() {
  return (
    <div className="container flex items-center gap-1 overflow-x-auto py-1.5">
      {MARKETPLACE_CATEGORIES.map((cat) => (
        <Link key={cat.id} href={`/products?category=${cat.slug}`} className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap">
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
