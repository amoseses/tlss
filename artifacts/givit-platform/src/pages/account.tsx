import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { User, Package, Heart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";

export default function AccountPage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/account");
  }, [loading, user, navigate]);

  if (loading) return <PageShell><div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" /></div></PageShell>;
  if (!user) return null;

  return (
    <PageShell narrow>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-givit-ember/10">
          <User className="h-7 w-7 text-givit-ember" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-givit-ink">{profile?.full_name || "Your account"}</h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {[
          { href: "/orders", icon: Package, label: "Orders", desc: "View your order history" },
          { href: "/products", icon: Heart, label: "Wishlist", desc: "Your saved products" },
          { href: "/concierge", icon: Settings, label: "AutoGift", desc: "Manage gift automation" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="givit-panel flex items-center gap-4 p-4 transition hover:border-givit-ember/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-givit-ember/10">
              <item.icon className="h-5 w-5 text-givit-ember" />
            </div>
            <div>
              <p className="font-semibold text-givit-ink">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
