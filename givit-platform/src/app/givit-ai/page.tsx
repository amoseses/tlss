"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCents, type GiftBoxRecommendation } from "@/lib/gifting/concierge";

export default function GivitAiPage() {
  const [loading, setLoading] = useState(false);
  const [box, setBox] = useState<GiftBoxRecommendation | null>(null);
  const [regenerationNote, setRegenerationNote] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/givit-ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientName: formData.get("recipientName"),
        relationship: formData.get("relationship"),
        occasion: formData.get("occasion"),
        budget: formData.get("budget"),
        interests: formData.get("interests"),
        avoidTerms: formData.get("avoidTerms"),
        style: formData.get("style"),
        surveyAnswers: formData.get("surveyAnswers"),
        regenerationNote,
      }),
    });
    const json = await response.json();
    setBox(json.giftBox ?? null);
    setLoading(false);
  }

  return (
    <PageShell>
      <PageHeader title="GivIt AI" description="A free standalone survey that uses the same recommendation engine as concierge automation, without saved payment, auto-purchasing, or admin fulfillment." />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-givit-ember" /> Quick gift survey</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Recipient name" name="recipientName" />
                <Field label="Relationship" name="relationship" required />
                <Field label="Occasion" name="occasion" required />
                <Field label="Budget" name="budget" type="number" defaultValue="75" required />
              </div>
              <TextArea label="Interests" name="interests" placeholder="coffee, travel, gardening" />
              <TextArea label="Avoid" name="avoidTerms" placeholder="alcohol, wool, duplicate gifts" />
              <Field label="Style" name="style" placeholder="cozy, luxury, practical, funny" />
              <TextArea label="Anything else?" name="surveyAnswers" placeholder="Tell GivIt about hobbies, colors, sizes, constraints, or the story behind the occasion." />
              <input type="hidden" value={regenerationNote} name="regenerationNote" />
              <Button disabled={loading} className="w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Get recommendation</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recommended gift box</CardTitle></CardHeader>
          <CardContent>
            {!box ? <p className="text-sm text-muted-foreground">Complete the survey to generate a structured gift box.</p> : (
              <div className="space-y-4">
                <div><h2 className="font-serif text-2xl font-bold">{box.headline}</h2><p className="mt-2 text-sm text-muted-foreground">{box.rationale}</p></div>
                <div className="rounded-2xl bg-muted/50 p-4 text-sm">Card text: “{box.card_message}”</div>
                <div className="space-y-2">{box.items.map((item, index) => <div key={`${item.title}-${index}`} className="flex justify-between gap-3 rounded-2xl border p-3 text-sm"><div><p className="font-medium">{item.title}</p><p className="text-muted-foreground">{item.description}</p>{item.external_url ? <a href={item.external_url} target="_blank" className="text-primary hover:underline">Source URL</a> : null}</div><span className="font-medium tabular-nums">{formatCents(item.price_cents)}</span></div>)}</div>
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-lg font-bold">Total estimate: {formatCents(box.total_cents)}</p><Button variant="outline" onClick={() => { setRegenerationNote(`regen-${Date.now()}`); document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(); }}>Re-generate</Button></div>
                <p className="text-xs text-muted-foreground">Want automated reminders, saved addresses, approval charging, and fulfillment tracking? <Link href="/signup?next=/concierge" className="text-primary hover:underline">Create a concierge account</Link>.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...rest} /></div>;
}

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} placeholder={placeholder} /></div>;
}
