"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Bell, CalendarPlus, CheckCircle2, CreditCard, Gift, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { approveGiftApprovalAction, generateGiftApprovalAction, saveConciergeRecipientAction, updateConciergeProfileAction, updateRecipientAutomationAction } from "@/app/actions/concierge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AUTOMATION_RULES, CONCIERGE_STEPS, createAddressLabel, formatCents, formatConciergeDate, getDaysUntil, iconForBundleItem, type ConciergeApproval, type ConciergeDashboardData, type ConciergeOccasion, type ConciergeRecipient } from "@/lib/gifting/concierge";

const stripePromises = new Map<string, ReturnType<typeof loadStripe>>();
function getStripePromise(key: string) {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key));
  return stripePromises.get(key)!;
}

export function ConciergeDashboard({ data }: { data: ConciergeDashboardData }) {
  const [showOnboarding, setShowOnboarding] = useState(!data.profile.concierge_onboarding_completed || data.recipients.length === 0);
  const paymentReady = Boolean(data.profile.stripe_customer_id && data.profile.stripe_default_payment_method_id);

  return (
    <div className="space-y-8">
      {showOnboarding ? (
        <div className="rounded-[2rem] border border-givit-ember/30 bg-givit-sand/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="bg-givit-ember text-white">First-login onboarding</Badge>
              <h1 className="mt-3 font-serif text-4xl font-bold text-givit-ink">Set-and-forget AI gift concierge</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">Add recipients, occasion dates, shipping addresses, automation preferences, and a Stripe-saved payment method. You can close this wizard now and edit everything here later from your profile dashboard.</p>
            </div>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowOnboarding(false)}>Skip for now</Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {CONCIERGE_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="border-givit-ember/15">
              <CardContent className="p-4">
                <Icon className="mb-3 h-5 w-5 text-givit-ember" />
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <AutomationCard enabled={data.profile.gift_automation_enabled} paymentReady={paymentReady} />
          <RecipientForm />
          <PaymentCard stripePublishableKey={data.stripePublishableKey} paymentReady={paymentReady} />
        </div>
        <div className="space-y-6">
          <RecipientsCard recipients={data.recipients} approvals={data.approvals} />
          <NotificationsCard notifications={data.notifications} />
          <ApprovalsCard approvals={data.approvals} recipients={data.recipients} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-givit-ember" /> Security and automation rules</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {AUTOMATION_RULES.map((rule) => <div key={rule} className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">{rule}</div>)}
        </CardContent>
      </Card>
    </div>
  );
}

function AutomationCard({ enabled, paymentReady }: { enabled: boolean; paymentReady: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Global concierge toggle</CardTitle></CardHeader>
      <CardContent>
        <form action={updateConciergeProfileAction} className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <span><span className="font-medium">Concierge Service</span><span className="block text-sm text-muted-foreground">Must be on, along with each recipient toggle, before cron sends survey prompts.</span></span>
            <input type="checkbox" name="gift_automation_enabled" defaultChecked={enabled} className="h-5 w-5 accent-givit-ember" />
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Global automation ON" : "Global automation OFF"}</Badge>
            <Badge variant={paymentReady ? "default" : "secondary"}>{paymentReady ? "Stripe payment ready" : "Payment setup needed"}</Badge>
          </div>
          <Button className="bg-givit-ember text-white hover:bg-givit-ember-hover">Save automation settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RecipientForm() {
  return (
    <Card id="onboarding">
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-givit-ember" /> Recipient, address, and occasion</CardTitle></CardHeader>
      <CardContent>
        <form action={saveConciergeRecipientAction} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Recipient name" name="name" required />
            <Field label="Relationship" name="relationship" required />
            <Field label="Occasion" name="occasion" placeholder="Birthday, anniversary…" required />
            <Field label="Occasion date" name="occasion_date" type="date" required />
            <Field label="Budget" name="budget" placeholder="$75" required />
            <div className="space-y-2"><Label>Delivery preference</Label><Select name="delivery_preference" defaultValue="ship"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ship">Ship a box</SelectItem><SelectItem value="email">Digital delivery</SelectItem><SelectItem value="either">Either</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Street address" name="ship_to_line1" required />
            <Field label="Apt / suite" name="ship_to_line2" />
            <Field label="City" name="ship_to_city" required />
            <Field label="State" name="ship_to_state" placeholder="CA" required />
            <Field label="ZIP" name="ship_to_zip" required />
            <Field label="Country" name="ship_to_country" defaultValue="US" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextAreaField label="Interests" name="interests" placeholder="coffee, gardening, travel" />
            <TextAreaField label="Avoid" name="avoid_terms" placeholder="alcohol, wool, duplicate gifts" />
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="recipient_automation_enabled" defaultChecked className="h-4 w-4 accent-givit-ember" /> Turn concierge service ON for this recipient</label>
          <Button className="w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">Save recipient and schedule 5-week survey</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentCard({ stripePublishableKey, paymentReady }: { stripePublishableKey: string | null; paymentReady: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-givit-ember" /> Stripe payment setup</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">Cards are captured with Stripe Elements and saved as a Stripe Customer payment method. Givit charges only after approval.</p>
        {stripePublishableKey ? (
          <Elements stripe={getStripePromise(stripePublishableKey)}><StripeSetupForm paymentReady={paymentReady} /></Elements>
        ) : (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable Stripe Elements.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StripeSetupForm({ paymentReady }: { paymentReady: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function saveCard(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const intentRes = await fetch("/api/concierge/setup-intent", { method: "POST" });
      const { clientSecret, error } = await intentRes.json();
      if (error || !clientSecret) throw new Error(error ?? "Could not create SetupIntent.");
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card entry is not ready.");
      const result = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message);
      await fetch("/api/concierge/setup-intent/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupIntentId: result.setupIntent.id }) });
      toast.success("Payment method saved for concierge approvals.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save card.");
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={saveCard} className="space-y-4"><div className="rounded-2xl border bg-white p-4"><CardElement /></div><Button disabled={!stripe || loading} className="bg-givit-ember text-white hover:bg-givit-ember-hover">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{paymentReady ? "Replace saved payment method" : "Save payment method"}</Button></form>;
}

function RecipientsCard({ recipients, approvals }: { recipients: ConciergeRecipient[]; approvals: ConciergeApproval[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Saved recipients</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {recipients.length === 0 ? <p className="text-sm text-muted-foreground">No recipients yet. Add one to schedule the five-week survey.</p> : recipients.map((recipient) => <RecipientRow key={recipient.id} recipient={recipient} approvals={approvals} />)}
      </CardContent>
    </Card>
  );
}

function RecipientRow({ recipient, approvals }: { recipient: ConciergeRecipient; approvals: ConciergeApproval[] }) {
  const [pending, startTransition] = useTransition();
  const latestApproval = approvals.find((approval) => approval.recipient_id === recipient.id);
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="font-semibold">{recipient.name} <span className="text-muted-foreground">· {recipient.relationship}</span></p><p className="text-sm text-muted-foreground">{createAddressLabel(recipient)}</p></div>
        <Button size="sm" variant={recipient.automation_enabled ? "default" : "outline"} disabled={pending} onClick={() => startTransition(async () => { await updateRecipientAutomationAction(recipient.id, !recipient.automation_enabled); })}>{recipient.automation_enabled ? "Recipient ON" : "Recipient OFF"}</Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {recipient.occasions?.map((occasion) => <SurveyForm key={occasion.id} recipient={recipient} occasion={occasion} approval={latestApproval} />)}
      </div>
    </div>
  );
}

function SurveyForm({ recipient, occasion, approval }: { recipient: ConciergeRecipient; occasion: ConciergeOccasion; approval?: ConciergeApproval }) {
  return (
    <form id="survey" action={generateGiftApprovalAction} className="rounded-2xl bg-muted/40 p-3">
      <input type="hidden" name="recipient_id" value={recipient.id} />
      <input type="hidden" name="occasion_id" value={occasion.id} />
      {approval ? <input type="hidden" name="approval_id" value={approval.id} /> : null}
      <p className="text-sm font-medium">{occasion.occasion}: {formatConciergeDate(occasion.occasion_date)}</p>
      <p className="text-xs text-muted-foreground">Survey trigger is 35 days before the occasion.</p>
      <div className="mt-3 space-y-2"><Label className="text-xs">Style / vibe</Label><Input name="style" placeholder="cozy, luxury, practical…" /></div>
      <div className="mt-2 space-y-2"><Label className="text-xs">Survey answers</Label><Textarea name="survey_answers" placeholder="What would make this feel thoughtful? Any sizes, colors, hobbies, or constraints?" /></div>
      {approval ? <Input className="mt-2" name="regeneration_note" placeholder="Optional note for regeneration" /> : null}
      <Button size="sm" className="mt-3 bg-givit-ember text-white hover:bg-givit-ember-hover"><Sparkles className="mr-2 h-4 w-4" />{approval ? "Re-generate" : "Generate gift box"}</Button>
    </form>
  );
}

function NotificationsCard({ notifications }: { notifications: ConciergeDashboardData["notifications"] }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-givit-ember" /> Notification schedule</CardTitle></CardHeader><CardContent className="space-y-3">{notifications.length === 0 ? <p className="text-sm text-muted-foreground">No scheduled notifications yet.</p> : notifications.map((n) => <div key={n.id} className="rounded-2xl border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{n.title}</p><Badge variant={n.status === "sent" ? "default" : "secondary"}>{n.status}</Badge></div><p className="text-xs text-muted-foreground">{formatConciergeDate(n.scheduled_for.slice(0, 10))} · {getDaysUntil(n.scheduled_for.slice(0, 10))} days</p><p className="mt-1 text-sm text-muted-foreground">{n.body}</p></div>)}</CardContent></Card>;
}

function ApprovalsCard({ approvals, recipients }: { approvals: ConciergeApproval[]; recipients: ConciergeRecipient[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-givit-ember" /> Admin-led order pipeline</CardTitle></CardHeader><CardContent className="space-y-4">{approvals.length === 0 ? <p className="text-sm text-muted-foreground">Generated gift boxes appear here for approval.</p> : approvals.map((approval) => {
    const recipient = recipients.find((r) => r.id === approval.recipient_id);
    return <div key={approval.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{approval.headline}</p><p className="text-sm text-muted-foreground">{recipient?.name} · {recipient ? createAddressLabel(recipient) : ""}</p></div><Badge>{approval.status === "paid_pending_fulfillment" ? "Paid - Pending Fulfillment" : approval.status}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{approval.rationale}</p><p className="mt-2 rounded-2xl bg-muted/50 p-3 text-sm">Card text: “{approval.card_message}”</p><div className="mt-3 space-y-2">{approval.gift_approval_items?.map((item) => { const Icon = iconForBundleItem(item.item_type); return <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"><div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 text-givit-ember" /><div><p className="font-medium">{item.title}</p><p className="text-muted-foreground">{item.description}</p>{item.external_url ? <a href={item.external_url} target="_blank" className="text-primary hover:underline">Source URL</a> : null}</div></div><span className="tabular-nums">{formatCents(item.price_cents)}</span></div>; })}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Total: {formatCents(approval.total_cents)}</p>{approval.status === "needs_approval" ? <Button disabled={pendingId === approval.id} className="bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={async () => { setPendingId(approval.id); try { await approveGiftApprovalAction(approval.id); toast.success("Charged and sent to admin fulfillment queue."); } catch (error) { toast.error(error instanceof Error ? error.message : "Approval failed."); } finally { setPendingId(null); } }}>{pendingId === approval.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Approve and Order</Button> : <Badge variant="secondary"><RefreshCw className="mr-1 h-3 w-3" /> Fulfillment tracking active</Badge>}</div></div>;
  })}</CardContent></Card>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...rest} /></div>;
}

function TextAreaField({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} placeholder={placeholder} /></div>;
}
