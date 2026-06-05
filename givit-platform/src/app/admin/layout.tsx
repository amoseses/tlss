import Link from "next/link";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/shipping", label: "Retailer links" },
  { href: "/admin/orders", label: "Signals" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/15 min-h-[60vh] border-t">
      <div className="container flex flex-col gap-8 py-10 md:flex-row">
        <aside className="md:w-52 shrink-0">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Admin curation
          </p>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "hover:bg-muted rounded-md px-3 py-2 text-sm font-medium transition-colors",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mt-6 block text-sm underline-offset-4 hover:underline"
          >
            ← Marketplace
          </Link>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
