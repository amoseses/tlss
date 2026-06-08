"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bell, CalendarPlus, Check, CreditCard, Lock, PackageCheck, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTOMATION_RULES,
  CONCIERGE_STEPS,
  CONCIERGE_STORAGE_KEY,
  DEFAULT_CONCIERGE_STATE,
  SURVEY_LEAD_DAYS,
  createFulfillmentTasks,
  dateBeforeOccasion,
  deliveryDateForOccasion,
  deliveryIcon,
  formatCents,
  formatConciergeDate,
  getBundleTotal,
  getDaysUntil,
  iconForBundleItem,
  type ConciergeRecipient,
  type ConciergeState,
  type GiftApproval,
} from "@/lib/gifting/concierge";

type Props = {
  isAuthenticated?: boolean;
};

const SURVEY_QUESTIONS = [
  "What are they into right now?",
  "Should the box feel practical, sentimental, fun, or premium?",
  "Anything Givit must avoid?",
  "Are flowers, a handwritten card, tickets, or a shipped present best for this occasion?",
];

function readState(): ConciergeState {
  if (typeof window === "undefined") return DEFAULT_CONCIERGE_STATE;
  try {
    const raw = window.localStorage.getItem(CONCIERGE_STORAGE_KEY);
    if (!raw) return DEFAULT_CONCIERGE_STATE;
    const parsed = JSON.parse(raw) as Partial<ConciergeState>;
    return {
      ...DEFAULT_CONCIERGE_STATE,
      ...parsed,
      profile: { ...DEFAULT_CONCIERGE_STATE.profile, ...parsed.profile },
      recipients: parsed.recipients ?? [],
      notifications: parsed.notifications ?? [],
      approvals: parsed.approvals ?? [],
    };
  } catch {
    return DEFAULT_CONCIERGE_STATE;
  }
}

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function createRecipient(formData: FormData): ConciergeRecipient {
  const id = `rec-${Date.now()}`;
  return {
    id,
    name: requiredString(formData, "name"),
    relationship: requiredString(formData, "relationship"),
    occasion: requiredString(formData, "occasion"),
    occasionDate: requiredString(formData, "occasionDate"),
    budget: requiredString(formData, "budget"),
    interests: requiredString(formData, "interests"),
    avoid: requiredString(formData, "avoid"),
    addressLabel: requiredString(formData, "addressLabel"),
    addressLine1: requiredString(formData, "addressLine1"),
    addressLine2: requiredString(formData, "addressLine2"),
    city: requiredString(formData, "city"),
    state: requiredString(formData, "state"),
    postalCode: requiredString(formData, "postalCode"),
    country: requiredString(formData, "country") || "US",
    deliveryPreference: String(formData.get("deliveryPreference") ?? "ship") as ConciergeRecipient["deliveryPreference"],
  };
}

function hasRequiredRecipientFields(recipient: ConciergeRecipient) {
  return Boolean(recipient.name && recipient.relationship && recipient.occasion && recipient.occasionDate && recipient.budget && recipient.addressLine1 && recipient.city && recipient.state && recipient.postalCode);
}

function createApproval(recipient: ConciergeRecipient, surveyAnswers: string[]): GiftApproval {
  const hasExperienceSignal = /ticket|game|music|concert|experience|travel|sports|show|event/i.test(`${recipient.interests} ${surveyAnswers.join(" ")}`);
  const wantsFlowers = /flower|bouquet|romantic|mom|mother|anniversary|birthday/i.test(`${recipient.relationship} ${recipient.occasion} ${surveyAnswers.join(" ")}`);
  const approval: GiftApproval = {
    id: `approval-${recipient.id}`,
    recipientId: recipient.id,
    status: surveyAnswers.some(Boolean) ? "needs_approval" : "needs_survey",
    headline: hasExperienceSignal ? `Givit survey experience box for ${recipient.name}` : `Givit survey gift box for ${recipient.name}`,
    rationale: `Built from the Givit survey, ${recipient.relationship}, ${recipient.budget}, interests (${recipient.interests}), avoid-list (${recipient.avoid || "none"}), and delivery details. The bundle includes the best mix of gift, card, flowers/add-ons, and fulfillment route before any charge is made.`,
    message: `I picked this with your ${recipient.occasion.toLowerCase()} in mind and wanted it to feel personal, useful, and easy to enjoy.`,
    estimatedDelivery: deliveryDateForOccasion(recipient.occasionDate),
    surveyScheduledFor: dateBeforeOccasion(recipient.occasionDate, SURVEY_LEAD_DAYS),
    surveyAnswers,
    items: hasExperienceSignal
      ? [
          { label: "Experience", description: "Digital tickets or experience credit matched from survey answers", priceCents: 8500, type: "experience", orderRoute: "digital_delivery" },
          { label: "Handwritten card", description: "Card copy sent to the admin account if a physical card is needed", priceCents: 700, type: "card", orderRoute: "admin_task" },
          { label: "Coordination", description: "Approval, ticket transfer, delivery reminders, and support", priceCents: 995, type: "service", orderRoute: "marketplace" },
        ]
      : [
          { label: "Main present", description: "AI-selected marketplace or partner item from survey fit", priceCents: 4200, type: "gift", orderRoute: "marketplace" },
          { label: "Handwritten card", description: "Message routed to the admin order account for writing or purchase", priceCents: 700, type: "card", orderRoute: "admin_task" },
          ...(wantsFlowers ? [{ label: "Flowers", description: "Bouquet or thoughtful add-on from a configured florist adapter", priceCents: 2400, type: "flowers" as const, orderRoute: "affiliate_checkout" as const }] : []),
          { label: "Shipping", description: "Tracked delivery with occasion buffer", priceCents: 995, type: "shipping", orderRoute: "marketplace" },
        ],
    fulfillmentTasks: [],
  };
  return { ...approval, fulfillmentTasks: createFulfillmentTasks(approval) };
}

function statusTone(status: GiftApproval["status"]) {
  if (status === "approved" || status === "ordered") return "bg-emerald-600 text-white";
  if (status === "needs_approval") return "bg-givit-ember text-white";
  if (status === "needs_survey" || status === "regenerating") return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

export function ConciergeDashboard({ isAuthenticated = false }: Props) {
  const [state, setState] = useState<ConciergeState>(() => readState());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window !== "undefined" && "Notification" in window) return window.Notification.permission;
    return "unsupported";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const setupScore = useMemo(() => {
    let score = 0;
    if (isAuthenticated) score += 20;
    if (state.profile.automationEnabled) score += 20;
    if (state.profile.addressStatus === "ready") score += 20;
    if (state.profile.paymentStatus === "ready") score += 20;
    if (state.recipients.length > 0) score += 20;
    return score;
  }, [isAuthenticated, state]);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      toast.warning("Browser push notifications are not supported in this environment; in-app notifications will still be scheduled.");
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      new window.Notification("Givit notifications are ready", {
        body: `Givit will send the survey ${SURVEY_LEAD_DAYS} days before each occasion and wait for approval before ordering.`,
      });
      toast.success("Push notifications enabled.");
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const paymentLabel = requiredString(formData, "paymentMethodLabel");
    const defaultAddress = requiredString(formData, "defaultAddress");
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        automationEnabled: formData.get("automationEnabled") === "on",
        paymentStatus: paymentLabel ? "ready" : "setup_pending",
        paymentMethodLabel: paymentLabel,
        addressStatus: defaultAddress ? "ready" : "missing",
        defaultAddress,
      },
    }));
    toast.success("Setup preferences saved.");
  }

  function addRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const recipient = createRecipient(formData);
    if (!hasRequiredRecipientFields(recipient)) {
      toast.error("Add the person, date, budget, and full delivery address before scheduling notifications.");
      return;
    }
    const surveyAnswers = SURVEY_QUESTIONS.map((_, index) => requiredString(formData, `survey${index}`)).filter(Boolean);
    const approval = createApproval(recipient, surveyAnswers);
    const notifications = state.profile.automationEnabled
      ? [
          {
            id: `notif-survey-${recipient.id}`,
            recipientId: recipient.id,
            title: `Givit survey for ${recipient.name}`,
            body: `Answer the Givit survey so AI can choose the best box ${SURVEY_LEAD_DAYS} days before ${recipient.occasion}.`,
            scheduledFor: approval.surveyScheduledFor,
            channel: "in_app" as const,
            status: "scheduled" as const,
            kind: "survey" as const,
          },
          {
            id: `notif-approval-${recipient.id}`,
            recipientId: recipient.id,
            title: `Approve ${recipient.name}'s gift box`,
            body: "Givit prepared the full gift box and needs approval before it charges or creates order tasks.",
            scheduledFor: approval.estimatedDelivery,
            channel: "in_app" as const,
            status: "scheduled" as const,
            kind: "approval" as const,
          },
        ]
      : [];

    setState((current) => ({
      ...current,
      recipients: [...current.recipients, recipient],
      approvals: [approval, ...current.approvals],
      notifications: [...notifications, ...current.notifications],
    }));
    form.reset();
    toast.success(state.profile.automationEnabled ? "Recipient saved; survey and approval notifications scheduled." : "Recipient saved. Turn service on to schedule notifications.");
  }

  function updateApproval(id: string, status: GiftApproval["status"]) {
    setState((current) => ({
      ...current,
      approvals: current.approvals.map((approval) => {
        if (approval.id !== id) return approval;
        if (status === "approved") {
          return {
            ...approval,
            status: "ordered",
            fulfillmentTasks: approval.fulfillmentTasks.map((task) => ({ ...task, status: task.status === "ready_for_admin" ? "ready_for_admin" : "ordered" })),
          };
        }
        return { ...approval, status };
      }),
      notifications: current.notifications.map((notification) =>
        notification.recipientId === current.approvals.find((approval) => approval.id === id)?.recipientId
          ? { ...notification, status: status === "approved" ? "approved" : notification.status }
          : notification,
      ),
    }));
    toast.success(status === "approved" ? "Approved. Order tasks were created for providers and the admin account." : "Bundle queued for regeneration.");
  }

  function resetSetup() {
    setState(DEFAULT_CONCIERGE_STATE);
    toast.success("Concierge setup reset.");
  }

  return (
    <div className="space-y-8">
      {!isAuthenticated ? (
        <Card className="border-givit-ember/30 bg-givit-sand/40">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-givit-ember text-white"><Lock className="h-5 w-5" /></span>
              <div>
                <h2 className="font-serif text-xl font-bold text-givit-ink">Log in to start notification setup.</h2>
                <p className="text-sm text-muted-foreground">Givit needs an account before saving addresses, tokenized payment setup, survey notifications, and approval history.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild className="bg-givit-ember text-white hover:bg-givit-ember-hover"><Link href="/login?next=%2Fconcierge">Log in</Link></Button>
              <Button asChild variant="outline"><Link href="/signup?next=%2Fconcierge">Create account</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-givit-ink p-6 text-white md:p-8">
          <Badge className="mb-4 bg-givit-ember text-white">Givit Autopilot</Badge>
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-5xl">Log in, turn service on, and let Givit schedule every gift.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
            Add people, dates, tokenized payment setup, full delivery addresses, and service preference. Five weeks before each date, Givit sends a survey, builds a gift box, and waits for approval before creating order tasks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={requestNotifications} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover"><Bell className="h-4 w-4" /> Enable alerts</Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"><Link href="/gift"><Sparkles className="h-4 w-4" /> Try gift AI</Link></Button>
          </div>
        </div>
        <Card className="border-givit-ember/20">
          <CardHeader><CardTitle className="flex items-center justify-between">Setup readiness <span className="text-givit-ember">{setupScore}%</span></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-givit-ember transition-all" style={{ width: `${setupScore}%` }} /></div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between"><span>Signed in</span><Badge variant="outline">{isAuthenticated ? "yes" : "needed"}</Badge></div>
              <div className="flex items-center justify-between"><span>Service on</span><Badge variant="outline">{state.profile.automationEnabled ? "on" : "off"}</Badge></div>
              <div className="flex items-center justify-between"><span>Payment token</span><Badge variant="outline">{state.profile.paymentStatus.replace("_", " ")}</Badge></div>
              <div className="flex items-center justify-between"><span>Address defaults</span><Badge variant="outline">{state.profile.addressStatus}</Badge></div>
              <div className="flex items-center justify-between"><span>Push permission</span><Badge variant="outline">{notificationPermission}</Badge></div>
            </div>
            <Button onClick={resetSetup} variant="ghost" className="w-full"><RotateCcw className="h-4 w-4" /> Reset setup</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {CONCIERGE_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember"><Icon className="h-4 w-4" /></span><Badge variant="outline">{index + 1}</Badge></div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-givit-ember" /> Checkout and service setup</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <label className="flex items-start gap-3 rounded-2xl border p-3 text-sm">
                <input name="automationEnabled" type="checkbox" defaultChecked={state.profile.automationEnabled} className="mt-1" />
                <span><strong>Turn Givit service on</strong><br /><span className="text-muted-foreground">Schedule surveys, approvals, and order work. If off, Givit only saves setup data.</span></span>
              </label>
              <div className="space-y-2"><Label htmlFor="paymentMethodLabel">Payment method token / last 4</Label><Input id="paymentMethodLabel" name="paymentMethodLabel" defaultValue={state.profile.paymentMethodLabel} placeholder="Stripe PM token or card ending in 4242" /></div>
              <p className="rounded-2xl bg-givit-sand p-3 text-xs leading-5 text-muted-foreground">Use Stripe Elements/SetupIntents in production. Do not type or store a full credit-card number in Givit; this field records the safe Stripe token/display label only.</p>
              <div className="space-y-2"><Label htmlFor="defaultAddress">Default billing / shipping address</Label><Textarea id="defaultAddress" name="defaultAddress" defaultValue={state.profile.defaultAddress} placeholder="Saved account address" /></div>
              <Button type="submit" className="w-full bg-givit-ember text-white hover:bg-givit-ember-hover"><ShieldCheck className="h-4 w-4" /> Save setup</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-givit-ember" /> Add a person, date, survey, and delivery address</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addRecipient} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="name">Person name</Label><Input id="name" name="name" required /></div>
                <div className="space-y-2"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" name="relationship" required /></div>
                <div className="space-y-2"><Label htmlFor="occasion">Occasion</Label><Input id="occasion" name="occasion" required /></div>
                <div className="space-y-2"><Label htmlFor="occasionDate">Date</Label><Input id="occasionDate" name="occasionDate" type="date" required /></div>
                <div className="space-y-2"><Label htmlFor="budget">Budget</Label><Input id="budget" name="budget" required /></div>
                <div className="space-y-2"><Label htmlFor="deliveryPreference">Delivery</Label><select id="deliveryPreference" name="deliveryPreference" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="ship">Ship</option><option value="email">Digital/email</option><option value="either">Either</option></select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="addressLabel">Address label</Label><Input id="addressLabel" name="addressLabel" required /></div>
                <div className="space-y-2"><Label htmlFor="addressLine1">Address line 1</Label><Input id="addressLine1" name="addressLine1" autoComplete="address-line1" required /></div>
                <div className="space-y-2"><Label htmlFor="addressLine2">Address line 2</Label><Input id="addressLine2" name="addressLine2" autoComplete="address-line2" /></div>
                <div className="space-y-2"><Label htmlFor="city">City</Label><Input id="city" name="city" autoComplete="address-level2" required /></div>
                <div className="space-y-2"><Label htmlFor="state">State</Label><Input id="state" name="state" autoComplete="address-level1" required /></div>
                <div className="space-y-2"><Label htmlFor="postalCode">ZIP/postal code</Label><Input id="postalCode" name="postalCode" autoComplete="postal-code" required /></div>
                <div className="space-y-2"><Label htmlFor="country">Country</Label><Input id="country" name="country" defaultValue="US" autoComplete="country" required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="interests">Known interests</Label><Textarea id="interests" name="interests" required /></div>
              <div className="space-y-2"><Label htmlFor="avoid">Avoid</Label><Input id="avoid" name="avoid" /></div>
              <div className="rounded-2xl border bg-givit-sand/40 p-4">
                <p className="text-sm font-semibold text-givit-ink">Givit survey answers (sent again {SURVEY_LEAD_DAYS} days before the date)</p>
                <div className="mt-3 grid gap-3">
                  {SURVEY_QUESTIONS.map((question, index) => <div key={question} className="space-y-2"><Label htmlFor={`survey${index}`}>{question}</Label><Input id={`survey${index}`} name={`survey${index}`} /></div>)}
                </div>
              </div>
              <Button type="submit" className="w-full bg-givit-ember text-white hover:bg-givit-ember-hover"><Send className="h-4 w-4" /> Save and schedule notifications</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">People and notification dates</h2>
          <div className="grid gap-3">
            {state.recipients.length === 0 ? <p className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">No recipients saved yet. Add a real person/date above to create the first 5-week survey notification.</p> : null}
            {state.recipients.map((recipient) => {
              const days = getDaysUntil(recipient.occasionDate);
              const DeliveryIcon = deliveryIcon(recipient.deliveryPreference);
              return (
                <Card key={recipient.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{recipient.name}</h3><p className="text-sm text-muted-foreground">{recipient.relationship} · {recipient.occasion} · {formatConciergeDate(recipient.occasionDate)}</p></div><Badge className={days <= 35 ? "bg-givit-ember text-white" : ""}>{days} days</Badge></div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><DeliveryIcon className="h-4 w-4 text-givit-ember" /> {recipient.addressLabel}: {recipient.city}, {recipient.state}</div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground"><strong>Likes:</strong> {recipient.interests}</p>
                    {recipient.avoid ? <p className="mt-1 text-xs leading-5 text-muted-foreground"><strong>Avoid:</strong> {recipient.avoid}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-2xl font-bold">Approval queue</h2><Badge variant="outline">{state.approvals.filter((approval) => approval.status === "needs_approval").length} need review</Badge></div>
          {state.approvals.length === 0 ? <p className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">Approvals appear after a recipient is saved and the Givit survey answers are available.</p> : null}
          {state.approvals.map((approval) => {
            const recipient = state.recipients.find((item) => item.id === approval.recipientId);
            return (
              <Card key={approval.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b bg-givit-sand/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge className={statusTone(approval.status)}>{approval.status.replace("_", " ")}</Badge><h3 className="mt-2 text-lg font-semibold">{approval.headline}</h3><p className="text-sm text-muted-foreground">For {recipient?.name ?? "recipient"} · survey {formatConciergeDate(approval.surveyScheduledFor)} · arrives by {formatConciergeDate(approval.estimatedDelivery)}</p></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-muted-foreground">Bundle total</p><p className="text-xl font-bold text-givit-ember">{formatCents(getBundleTotal(approval.items))}</p></div></div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{approval.rationale}</p>
                  </div>
                  <div className="grid gap-4 p-4 md:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-2">
                      {approval.items.map((item) => {
                        const Icon = iconForBundleItem(item.type);
                        return <div key={`${approval.id}-${item.label}`} className="flex gap-3 rounded-2xl border p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.label} · {formatCents(item.priceCents)}</p><p className="text-xs leading-5 text-muted-foreground">{item.description}</p><Badge variant="outline" className="mt-2">{item.orderRoute.replace("_", " ")}</Badge></div></div>;
                      })}
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-givit-ember">Card message</p><p className="mt-2 text-sm leading-6">“{approval.message}”</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2"><Button onClick={() => updateApproval(approval.id, "approved")} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> Approve</Button><Button onClick={() => updateApproval(approval.id, "regenerating")} variant="outline"><X className="h-4 w-4" /> Regenerate</Button></div>
                      <div className="mt-4 space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Order tasks</p>{approval.fulfillmentTasks.map((task) => <div key={task.id} className="rounded-xl border bg-background p-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{task.itemLabel}</span><Badge variant="outline">{task.status.replace("_", " ")}</Badge></div><p className="mt-1 text-muted-foreground">{task.details}</p></div>)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-givit-ember" /> Notification schedule</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {state.notifications.length === 0 ? <p className="text-sm text-muted-foreground">Turn service on and add a recipient to schedule the 5-week survey and approval notification.</p> : null}
            {state.notifications.map((notification) => {
              const recipient = state.recipients.find((item) => item.id === notification.recipientId);
              return <div key={notification.id} className="rounded-2xl border p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{notification.title}</p><Badge variant="outline">{notification.kind}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{recipient?.name ?? "Recipient"} · {formatConciergeDate(notification.scheduledFor)} · {notification.channel} · {notification.status}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{notification.body}</p></div>;
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-givit-ember" /> Automation guardrails</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2 text-sm text-muted-foreground">{AUTOMATION_RULES.map((rule) => <li key={rule} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {rule}</li>)}</ul></CardContent>
        </Card>
      </section>
    </div>
  );
}
