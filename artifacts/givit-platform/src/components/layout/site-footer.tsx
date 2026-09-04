import { Link, useLocation } from "wouter";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

import { SponsorMarquee } from "@/components/marketing/sponsor-marquee";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";

export function SiteFooter() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  }

  return (
    <footer className="border-t border-border bg-background text-foreground/70">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          <div className="col-span-2">
            <Link href="/home" className="mb-3 flex items-center gap-2">
              <img src="/Screenshot 2026-06-23 095149.png" alt="GIVIT" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-serif text-lg font-bold text-foreground">
                GIVIT
              </span>
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
              AI gift discovery and a curated marketplace. No brand deals in rankings.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Explore</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="transition-colors hover:text-foreground">Marketplace</Link></li>
              <li><Link href="/gift" className="transition-colors hover:text-foreground">Your Gift AI</Link></li>
              <li><Link href="/concierge" className="transition-colors hover:text-foreground">AutoGift</Link></li>
              <li><Link href="/boards" className="transition-colors hover:text-foreground">Gift Boards</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-foreground">About</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Account</p>
            <ul className="space-y-2.5 text-sm">
              {user ? (
                <>
                  <li><Link href="/account" className="transition-colors hover:text-foreground">Settings</Link></li>
                  <li><Link href="/orders" className="transition-colors hover:text-foreground">Orders</Link></li>
                  <li><button onClick={signOut} className="transition-colors hover:text-foreground">Sign out</button></li>
                </>
              ) : (
                <>
                  <li><Link href="/login" className="transition-colors hover:text-foreground">Sign In</Link></li>
                  <li><Link href="/signup" className="transition-colors hover:text-foreground">Sign Up</Link></li>
                </>
              )}
              <li><Link href="/feedback" className="transition-colors hover:text-foreground">Feedback</Link></li>
              <li><a href="https://calendly.com/atticusmoes/new-meeting" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <Link
          href="/beta-tester-survey"
          className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border border-givit-ember/25 bg-gradient-to-r from-givit-ember/15 to-givit-coral/10 p-5 transition-colors hover:border-givit-ember/40 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-givit-ember/20 text-givit-ember">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif text-base font-bold text-foreground">Become a beta tester</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Shape Your Gift AI, AutoGift, and the marketplace before anyone else sees them.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-givit-ember px-4 py-2 text-xs font-semibold text-white">
            Join the beta <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Backed by</p>
          <SponsorMarquee />
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground/80">
            <p>© {new Date().getFullYear()} GIVIT. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground/80">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                No brand deals in rankings
              </div>
              <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">Terms of Use</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
