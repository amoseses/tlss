import { PageShell } from "@/components/layout/page-shell";

export default function TermsPage() {
  return (
    <PageShell narrow>
      <h1 className="font-serif text-3xl font-bold text-givit-ink mb-2">Terms of Use</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>
      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Using GIVIT</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">GIVIT is a gift discovery platform. By using this service you agree not to misuse it, attempt to scrape data at scale, or use automated tools to abuse the AI recommendation engine.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Affiliate links</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Some product links on GIVIT are affiliate links. When you purchase through them, we may earn a small commission at no extra cost to you. This commission never influences our rankings or AI recommendations.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">No warranties</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Product information, prices, and availability are sourced from retailers and may change. GIVIT provides gift recommendations as suggestions only — we cannot guarantee any particular outcome from a gift.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Accounts</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">You are responsible for keeping your account credentials secure. GIVIT reserves the right to suspend accounts that violate these terms.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Contact</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Questions about these terms? Reach us via the <a href="/feedback" className="text-givit-ember underline">Feedback page</a>.</p>
        </section>
      </div>
    </PageShell>
  );
}
