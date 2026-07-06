import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { GiftSurveyModal } from "@/components/autogift/autogift-survey-modal";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function AutoGiftRecommendPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const recipient = params.get("recipient") || "your recipient";
  const occasion = params.get("occasion") || "special day";
  const date = params.get("date") || new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
  const [open, setOpen] = useState(true);

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl rounded-2xl border border-givit-ember/20 bg-gradient-to-br from-givit-coral/20 via-givit-ember/10 to-givit-coral/5 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">AutoGift AI bundle builder</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-givit-ink">Build a human-feeling package for {recipient}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Answer a few quick prompts and Givit AI will create three clear options — bundles or one standout gift — with exact items, links, photos, pricing, and approval before anything is ordered.
        </p>
        <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-xl bg-black/20 p-3 text-sm"><b>Saved context</b><p className="text-xs text-muted-foreground">Recipient, relationship, date, age/year context.</p></div>
          <div className="rounded-xl bg-black/20 p-3 text-sm"><b>Package options</b><p className="text-xs text-muted-foreground">One present or full package with card, flowers, and excursions.</p></div>
          <div className="rounded-xl bg-black/20 p-3 text-sm"><b>Approval first</b><p className="text-xs text-muted-foreground">No charge until you approve the final calculated bundle.</p></div>
        </div>
        <Button onClick={() => setOpen(true)} className="mt-6 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Open tailored survey</Button>
      </div>
      {open && <GiftSurveyModal recipientName={recipient} occasion={occasion} occasionDate={date} onClose={() => setOpen(false)} />}
    </PageShell>
  );
}
