import { PageShell } from "@/components/layout/page-shell";

export default function PrivacyPage() {
  return (
    <PageShell narrow>
      <h1 className="font-serif text-3xl font-bold text-givit-ink mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: August 2026</p>
      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">What we collect</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">GIVIT collects only what's necessary to run the service:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-muted-foreground">
            <li><strong className="text-foreground">Your account:</strong> email address and name when you sign up.</li>
            <li><strong className="text-foreground">People you tell us about:</strong> names, relationships, birthdays, anniversaries, interests, gift survey answers (including personality traits and past gift reactions you share), and notes you save for the people in your life, so AutoGift and Your Gift AI can plan around them. You control this data: add, edit, or remove any person or date any time from the People page.</li>
            <li><strong className="text-foreground">Calendar data, if you connect Google Calendar:</strong> we request read-only access to detect birthdays and anniversaries. We store the connection token (never your Google password) and only read the specific calendars you sync; we don't read unrelated email or files. You can disconnect at any time from the People page, which immediately revokes and deletes the stored token.</li>
            <li><strong className="text-foreground">Payment information:</strong> card details are collected and tokenized directly by Stripe, our payment processor. GIVIT's own servers never receive or store your full card number or CVC, only a token and the card's brand/last 4 digits, which is standard practice for PCI compliance.</li>
            <li><strong className="text-foreground">Product activity:</strong> wishlist items, saved gift preferences, and order history tied to your account.</li>
          </ul>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">We do not sell or rent this data to third parties, ever.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Where it's stored, and integrations</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Account and recipient data lives in our database, hosted by Supabase, and access is restricted by row-level security so only your own account can read your data (our servers use a separate, tightly scoped key for background jobs like reminder emails). The site itself is hosted on Vercel. Beyond that, a handful of specialized integrations handle specific tasks on our behalf and only ever see what's needed for that task:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-muted-foreground">
            <li><strong className="text-foreground">Stripe:</strong> tokenizes and stores your card for AutoGift charges; we never see the full card number.</li>
            <li><strong className="text-foreground">Google:</strong> Calendar sync, if you connect it, and the Gemini models that power Your Gift AI and AutoGift's recommendations.</li>
            <li><strong className="text-foreground">Amazon Web Services (S3, SES, SNS):</strong> S3 stores images you upload (e.g. to a board); SES sends reminder, receipt, and notification emails; SNS sends SMS text reminders only to the phone number you provide, and only after you explicitly opt in from your Account page. You can opt out at any time by replying STOP to a text or turning it off in Account settings — see "SMS communications" in our <a href="/terms" className="text-givit-ember underline">Terms of Use</a> for the full consent language.</li>
          </ul>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">None of these integrations are permitted to use your data for their own purposes, and we don't add a new one without a real feature that needs it.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">AI and your data</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Queries you send to Your Gift AI, and the recipient details AutoGift uses to build proposals, are sent to our AI provider (currently Groq, running open-weight language models) to generate recommendations and reasoning. We do not use your personal messages or recipient details to train third-party AI models. We may use anonymized, aggregated usage patterns internally to improve recommendation quality.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Data about people who aren't GIVIT users</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">AutoGift and the People page are built around information you provide about the recipients in your life — most of whom have never created a GIVIT account and haven't given us consent directly. When you add a person, you're representing that you have a lawful basis (typically your personal or family relationship with them) to share their name, dates, and preferences with us for the purpose of planning and sending them a gift. We only use that data for the gifting features you use it for: generating recommendations, scheduling reminders, and fulfilling AutoGift orders. If a recipient contacts us directly through the <a href="/feedback" className="text-givit-ember underline">Feedback page</a> about data stored about them, we will honor a reasonable request to review or delete it, coordinating with the account holder where appropriate.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Cookies and local storage</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">We use browser local storage to save your wishlist, recently viewed products, and in-progress AutoGift setup so you don't lose it on a refresh. We use minimal session cookies for authentication. We do not use third-party advertising or tracking cookies.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">No brand deals</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">GIVIT's rankings and AI recommendations are editorially independent. We do not accept payment from brands or retailers to promote products. When we include affiliate links, we disclose them clearly. Any commission we earn never influences which products we recommend.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Your rights</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">You can view, edit, or delete any person, date, or wishlist item yourself at any time from the People and account pages. To request a full export or deletion of your account and all associated data, or to disconnect a linked service like Google Calendar, contact us through the <a href="/feedback" className="text-givit-ember underline">Feedback page</a> and we'll handle it directly, typically within a few business days.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-givit-ink">Contact</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">Questions about this policy or your data? Reach us through the <a href="/feedback" className="text-givit-ember underline">Feedback page</a>.</p>
        </section>
      </div>
    </PageShell>
  );
}
