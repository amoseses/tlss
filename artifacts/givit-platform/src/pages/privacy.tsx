import { PageShell } from "@/components/layout/page-shell";

export default function PrivacyPage() {
  return (
    <PageShell narrow>
      <h1 className="font-serif text-3xl font-bold text-givit-ink mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>
      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">What we collect</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">GIVIT collects only what's necessary to run the service: your email address when you sign up, gift preferences you save, and wishlist items. We do not sell, rent, or share this data with third parties.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">No brand deals</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">GIVIT's rankings and AI recommendations are editorially independent. We do not accept payment from brands or retailers to promote products. When we include affiliate links, we disclose them clearly. Any commission we earn never influences which products we recommend.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Cookies and local storage</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">We use browser local storage to save your wishlist, recently viewed products, and gift preferences. We use minimal session cookies for authentication. We do not use third-party tracking cookies.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">AI and your data</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Queries you send to Givit AI are processed to generate gift recommendations. We may use anonymised, aggregated patterns to improve recommendation quality. We do not use your personal messages to train third-party AI models.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Contact</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Questions? Reach us through the <a href="/feedback" className="text-givit-ember underline">Feedback page</a>.</p>
        </section>
      </div>
    </PageShell>
  );
}
