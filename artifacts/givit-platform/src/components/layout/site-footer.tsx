import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white/70">
      <div className="container py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          <div className="col-span-2">
            <Link href="/home" className="mb-3 flex items-center gap-2">
              <img src="/Screenshot 2026-06-23 095149.png" alt="Givit" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-serif text-lg font-bold text-white">
                GIV<span className="text-givit-coral">IT</span>
              </span>
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-white/50">
              AI gift discovery and a curated marketplace. No brand deals in rankings.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35">Explore</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="text-white/70 transition-colors hover:text-white">Marketplace</Link></li>
              <li><Link href="/gift" className="text-white/70 transition-colors hover:text-white">Givit AI</Link></li>
              <li><Link href="/concierge" className="text-white/70 transition-colors hover:text-white">AutoGift</Link></li>
              <li><Link href="/boards" className="text-white/70 transition-colors hover:text-white">Gift Boards</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35">Account</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/login" className="text-white/70 transition-colors hover:text-white">Sign In</Link></li>
              <li><Link href="/signup" className="text-white/70 transition-colors hover:text-white">Sign Up</Link></li>
              <li><Link href="/account" className="text-white/70 transition-colors hover:text-white">Settings</Link></li>
              <li><Link href="/feedback" className="text-white/70 transition-colors hover:text-white">Feedback</Link></li>
              <li><a href="tel:2673785600" className="text-white/70 transition-colors hover:text-white">Book a call</a></li>
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
              <p className="font-serif text-base font-bold text-white">Become a beta tester</p>
              <p className="text-xs leading-relaxed text-white/50">Shape Givit AI, AutoGift, and the marketplace before anyone else sees them.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-givit-ember px-4 py-2 text-xs font-semibold text-white">
            Join the beta <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} GIVIT. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-white/40">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                No brand deals in rankings
              </div>
              <Link href="/privacy" className="transition-colors hover:text-white/60">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors hover:text-white/60">Terms of Use</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
