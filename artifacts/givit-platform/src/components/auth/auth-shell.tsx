import type { ReactNode } from "react";
import { Link } from "wouter";
import { ShieldCheck, CreditCard, Sparkles } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-160px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-black p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-givit-ember/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-givit-coral/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2">
          <img src="/Screenshot 2026-06-23 095149.png" alt="Givit" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-serif text-2xl font-bold text-white">GIV<span className="text-givit-coral">IT</span></span>
        </Link>

        <div className="relative space-y-6">
          <h2 className="max-w-md font-serif text-4xl font-bold leading-tight text-white">{title}</h2>
          <p className="max-w-sm text-sm leading-6 text-white/70">{subtitle}</p>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 shrink-0 text-givit-coral" /> No brand deals in rankings</li>
            <li className="flex items-center gap-2.5"><CreditCard className="h-4 w-4 shrink-0 text-givit-coral" /> You approve before any charge</li>
            <li className="flex items-center gap-2.5"><Sparkles className="h-4 w-4 shrink-0 text-givit-coral" /> AI-personalized picks, not guesswork</li>
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Givit</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-givit-ember">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-2xl font-bold text-givit-ink">GIV<span className="text-givit-coral">IT</span></span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
