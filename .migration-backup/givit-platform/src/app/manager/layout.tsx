import Link from "next/link";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { cn } from "@/lib/utils";

const links = [
  { href: "/manager", label: "Overview" },
  { href: "/manager/users", label: "Users" },
  { href: "/manager/feedback", label: "Feedback" },
  { href: "/manager/orders", label: "Orders" },
];

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="bg-muted/15 min-h-[60vh] border-t">
      <div className="container flex flex-col gap-8 py-10 md:flex-row">
        <aside className="md:w-56 shrink-0">
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
            Manager console
          </p>
          <p className="text-muted-foreground mb-4 text-xs">Platform administration</p>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "hover:bg-muted rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 space-y-2">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground block text-sm underline-offset-4 hover:underline"
            >
              Seller console →
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground block text-sm underline-offset-4 hover:underline"
            >
              ← Storefront
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
