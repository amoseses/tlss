"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Bell, CalendarPlus, CheckCircle2, CreditCard, Gift, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { approveGiftApprovalAction, generateGiftApprovalAction, removeGiftApprovalItemAction, saveConciergeRecipientAction, updateConciergeProfileAction, updateRecipientAutomationAction } from "@/app/actions/concierge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AUTOMATION_RULES, createAddressLabel, formatCents, formatConciergeDate, getDaysUntil, iconForBundleItem, type ConciergeApproval, type ConciergeDashboardData, type ConciergeOccasion, type ConciergeRecipient } from "@/lib/gifting/concierge";

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
        <ConciergeSetupWizard
          onClose={() => setShowOnboarding(false)}
          enabled={data.profile.gift_automation_enabled}
          paymentReady={paymentReady}
          stripePublishableKey={data.stripePublishableKey}
        />
      ) : null}

      <div className="rounded-[2rem] border bg-givit-ink p-6 text-white shadow-sm">
        <Badge className="bg-white text-givit-ink">Concierge</Badge>
        <h1 className="mt-3 font-serif text-4xl font-bold">Gift autopilot, approval-only.</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/65">Add people and dates. Givit pings you 5–6 weeks out, builds the gift, and charges only when you approve.</p>
        <Button type="button" className="mt-5 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={() => setShowOnboarding(true)}>Open setup wizard</Button>
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
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-givit-ember" /> Add a recipient</CardTitle></CardHeader>
      <CardContent>
        <ConciergeRecipientFields />
      </CardContent>
    </Card>
  );
}

function ConciergeRecipientFields({ compact = false }: { compact?: boolean }) {
  return (
    <form action={saveConciergeRecipientAction} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Important date" name="occasion_date" type="date" required />
        <input type="hidden" name="relationship" value="recipient" />
        <input type="hidden" name="occasion" value="Important date" />
        <input type="hidden" name="budget" value="75" />
        <input type="hidden" name="delivery_preference" value="ship" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Street" name="ship_to_line1" required />
        <Field label="Apt" name="ship_to_line2" />
        <Field label="City" name="ship_to_city" required />
        <Field label="State" name="ship_to_state" placeholder="CA" required />
        <Field label="ZIP" name="ship_to_zip" required />
        <Field label="Country" name="ship_to_country" defaultValue="US" required />
      </div>
      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextAreaField label="Interests" name="interests" placeholder="coffee, gardening, travel" />
          <TextAreaField label="Avoid" name="avoid_terms" placeholder="alcohol, wool, duplicates" />
        </div>
      ) : null}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="recipient_automation_enabled" defaultChecked className="h-4 w-4 accent-givit-ember" /> Concierge on for this person</label>
      <Button className="w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">Save</Button>
    </form>
  );
}

function ConciergeSetupWizard({ onClose, enabled, paymentReady, stripePublishableKey }: { onClose: () => void; enabled: boolean; paymentReady: boolean; stripePublishableKey: string | null }) {
  const [step, setStep] = useState(0);
  const steps = ["Permissions", "People + dates", "Shipping + card"];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-givit-ink/80 p-4 backdrop-blur-sm">
      <div className="mx-auto min-h-[92vh] max-w-4xl rounded-[2rem] bg-white p-5 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-givit-ink text-white">Setup wizard</Badge>
            <h2 className="mt-3 font-serif text-3xl font-bold text-givit-ink">Concierge in three steps.</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-full px-4 py-2 text-sm font-medium ${index === step ? "bg-givit-ink text-white" : "bg-muted text-muted-foreground"}`}>{index + 1}. {label}</button>)}
        </div>

        <div className="mt-8">
          {step === 0 ? (
            <div className="space-y-5">
              <h3 className="font-serif text-2xl font-bold">Allow reminders and approval charging</h3>
              <form action={updateConciergeProfileAction} className="space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <span><span className="font-medium">Notifications</span><span className="block text-sm text-muted-foreground">Survey prompts arrive 5–6 weeks before each date.</span></span>
                  <input type="checkbox" name="gift_automation_enabled" defaultChecked={enabled} className="h-5 w-5 accent-givit-ember" />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <span><span className="font-medium">Auto-charge after approval</span><span className="block text-sm text-muted-foreground">Approve once; Stripe charges the saved card and queues admin fulfillment.</span></span>
                  <input type="checkbox" defaultChecked className="h-5 w-5 accent-givit-ember" />
                </label>
                <Button className="bg-givit-ember text-white hover:bg-givit-ember-hover">Save permissions</Button>
              </form>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="space-y-5">
              <h3 className="font-serif text-2xl font-bold">Who and when?</h3>
              <p className="text-sm text-muted-foreground">Just name the person and date now. You can add interests during the 5–6 week gift questionnaire.</p>
              <ConciergeRecipientFields compact />
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="font-serif text-2xl font-bold">Shipping details</h3>
                <p className="mt-2 text-sm text-muted-foreground">Shipping saves on the recipient record. Add another person if needed.</p>
                <div className="mt-4"><ConciergeRecipientFields compact /></div>
              </div>
              <PaymentCard stripePublishableKey={stripePublishableKey} paymentReady={paymentReady} />
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-between border-t pt-4">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</Button>
          <Button type="button" className="bg-givit-ink text-white hover:bg-givit-ink/90" onClick={() => step === steps.length - 1 ? onClose() : setStep((value) => Math.min(steps.length - 1, value + 1))}>{step === steps.length - 1 ? "Done" : "Next"}</Button>
        </div>
      </div>
    </div>
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
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="space-y-2"><Label className="text-xs">Budget</Label><Input name="budget" type="number" defaultValue={Math.round(recipient.default_budget_cents / 100)} /></div><div className="space-y-2"><Label className="text-xs">Style / vibe</Label><Input name="style" placeholder="cozy, luxury, practical…" /></div></div>
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-givit-ember" /> Admin-led order pipeline</CardTitle></CardHeader><CardContent className="space-y-4">{approvals.length === 0 ? <p className="text-sm text-muted-foreground">Generated gift boxes appear here for approval.</p> : approvals.map((approval) => {
    const recipient = recipients.find((r) => r.id === approval.recipient_id);
    return <div key={approval.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{approval.headline}</p><p className="text-sm text-muted-foreground">{recipient?.name} · {recipient ? createAddressLabel(recipient) : ""}</p></div><Badge>{approval.status === "paid_pending_fulfillment" ? "Paid - Pending Fulfillment" : approval.status}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{approval.rationale}</p><p className="mt-2 rounded-2xl bg-muted/50 p-3 text-sm">Card text: “{approval.card_message}”</p><div className="mt-3 space-y-2">{approval.gift_approval_items?.map((item) => { const Icon = iconForBundleItem(item.item_type); return <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"><div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 text-givit-ember" /><div><p className="font-medium">{item.title}</p><p className="text-muted-foreground">{item.description}</p>{item.external_url ? <a href={item.external_url} target="_blank" className="text-primary hover:underline">Source URL</a> : null}{approval.status === "needs_approval" && (approval.gift_approval_items?.length ?? 0) > 1 ? <button type="button" className="mt-1 block text-xs text-destructive hover:underline" disabled={removingId === item.id} onClick={async () => { setRemovingId(item.id); try { await removeGiftApprovalItemAction(approval.id, item.id); toast.success("Item removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove item."); } finally { setRemovingId(null); } }}>Remove item</button> : null}</div></div><span className="tabular-nums">{formatCents(item.price_cents)}</span></div>; })}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Total: {formatCents(approval.total_cents)}</p>{approval.status === "needs_approval" ? <Button disabled={pendingId === approval.id} className="bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={async () => { setPendingId(approval.id); try { await approveGiftApprovalAction(approval.id); toast.success("Charged and sent to admin fulfillment queue."); } catch (error) { toast.error(error instanceof Error ? error.message : "Approval failed."); } finally { setPendingId(null); } }}>{pendingId === approval.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Approve and Order</Button> : <Badge variant="secondary"><RefreshCw className="mr-1 h-3 w-3" /> Fulfillment tracking active</Badge>}</div></div>;
  })}</CardContent></Card>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...rest} /></div>;
}

function TextAreaField({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} placeholder={placeholder} /></div>;
}
