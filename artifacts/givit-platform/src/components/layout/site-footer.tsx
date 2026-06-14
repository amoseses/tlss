import { Link } from "wouter";
import { Gift, Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-givit-ink text-white/70">
      <div className="container py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-givit-ember">
                <Gift className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-serif text-lg font-bold text-white">
                GIV<span className="text-givit-coral">IT</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-white/50 max-w-[180px]">
              AI gift discovery plus a free, admin-ranked marketplace of best-item picks.
            </p>
            <Link
              href="/gift"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-givit-ember px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-givit-ember-hover"
            >
              <Sparkles className="h-3 w-3" />
              Try Gift AI
            </Link>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Discover</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/gift" className="hover:text-white transition-colors">AI Gift Finder</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link href="/products?sort=popular" className="hover:text-white transition-colors">Top Ranked</Link></li>
              <li><Link href="/boards" className="hover:text-white transition-colors">Gift Boards</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Marketplace</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?category=tech" className="hover:text-white transition-colors">Tech Gifts</Link></li>
              <li><Link href="/products?category=home" className="hover:text-white transition-colors">Home Gifts</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Admin Curation</Link></li>
              <li><Link href="/feedback" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link href="/account" className="hover:text-white transition-colors">Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6 text-xs text-white/30">
          <p>© {new Date().getFullYear()} GIVIT. All rights reserved.</p>
          <p>No brand deals in rankings · Original retailer links · AI-ready catalog</p>
        </div>
      </div>
    </footer>
  );
}
