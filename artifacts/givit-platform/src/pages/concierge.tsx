import { useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Bell, Calendar, Gift, Package, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";

export default function ConciergePage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/concierge");
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!user) return null;

  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your gift concierge</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}. Set up gift automation below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="givit-section flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-givit-ember/10">
              <Users className="h-5 w-5 text-givit-ember" />
            </div>
            <div>
              <h2 className="font-semibold text-givit-ink">Gift recipients</h2>
              <p className="text-xs text-muted-foreground">People you gift to regularly</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Add family members, friends, and coworkers to build your gift automation list.</p>
          <Button className="mt-auto rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Plus className="h-4 w-4" /> Add recipient
          </Button>
        </div>

        <div className="givit-section flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-givit-ink">Occasions</h2>
              <p className="text-xs text-muted-foreground">Birthdays, anniversaries, holidays</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Schedule notifications and get AI gift options delivered before each event.</p>
          <Button variant="outline" className="mt-auto rounded-full">
            <Plus className="h-4 w-4" /> Add occasion
          </Button>
        </div>

        <div className="givit-section flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
              <Bell className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-givit-ink">Notifications</h2>
              <p className="text-xs text-muted-foreground">Alerts before big moments</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Get reminded 5–6 weeks before each occasion with curated gift options ready to approve.</p>
          <Button variant="outline" className="mt-auto rounded-full">Configure alerts</Button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-gradient-to-br from-givit-ember/10 to-amber-100/40 border border-givit-ember/20 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-givit-ember text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-givit-ink">How AutoGift works</h2>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Add a recipient and their occasion dates</li>
              <li>2. We notify you 5–6 weeks before each event</li>
              <li>3. Approve one of the AI-curated gift options</li>
              <li>4. We handle ordering, card writing, and delivery</li>
            </ol>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button asChild className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/gift"><Gift className="h-4 w-4" /> Try AI gift finder first</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/products"><Package className="h-4 w-4" /> Browse marketplace</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
