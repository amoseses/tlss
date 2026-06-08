"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, CalendarPlus, Check, CreditCard, ExternalLink, PlayCircle, Send, ShieldCheck, ToggleLeft, ToggleRight, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTOMATION_RULES,
  CONCIERGE_AUTOMATION_CONFIG,
  CONCIERGE_STEPS,
  CONCIERGE_STORAGE_KEY,
  DEFAULT_CONCIERGE_STATE,
  SURVEY_LEAD_DAYS,
  createAddressLabel,
  deliveryIcon,
  formatCents,
  formatConciergeDate,
  getApprovalDate,
  getBundleTotal,
  getDaysUntil,
  getEstimatedDeliveryDate,
  getSurveyDate,
  iconForBundleItem,
  type ConciergeNotification,
  type ConciergeRecipient,
  type ConciergeState,
  type GiftApproval,
  type GiftBundleItem,
} from "@/lib/gifting/concierge";

function readState(): ConciergeState {
  if (typeof window === "undefined") return DEFAULT_CONCIERGE_STATE;
  try {
    const raw = window.localStorage.getItem(CONCIERGE_STORAGE_KEY);
    if (!raw) return DEFAULT_CONCIERGE_STATE;
    return { ...DEFAULT_CONCIERGE_STATE, ...(JSON.parse(raw) as Partial<ConciergeState>) };
  } catch {
    return DEFAULT_CONCIERGE_STATE;
  }
}

function centsFromBudget(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 7500;
}

function createRecipient(formData: FormData): ConciergeRecipient {
  const addressParts = {
    addressLine1: String(formData.get("addressLine1") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    postalCode: String(formData.get("postalCode") ?? "").trim(),
    country: String(formData.get("country") ?? "US").trim() || "US",
  };
  const deliveryPreference = String(formData.get("deliveryPreference") ?? "ship") as ConciergeRecipient["deliveryPreference"];

  return {
    id: `rec-${Date.now()}`,
    name: String(formData.get("name") ?? "").trim(),
    relationship: String(formData.get("relationship") ?? "").trim(),
    occasion: String(formData.get("occasion") ?? "").trim(),
    occasionDate: String(formData.get("occasionDate") ?? "").trim(),
    budget: String(formData.get("budget") ?? "").trim(),
    interests: String(formData.get("interests") ?? "").trim(),
    avoid: String(formData.get("avoid") ?? "").trim(),
    addressLine1: addressParts.addressLine1,
    addressLine2: String(formData.get("addressLine2") ?? "").trim(),
    city: addressParts.city,
    state: addressParts.state,
    postalCode: addressParts.postalCode,
    country: addressParts.country,
    addressLabel: createAddressLabel(addressParts),
    deliveryPreference: ["ship", "email", "either"].includes(deliveryPreference) ? deliveryPreference : "ship",
    surveyStatus: "scheduled",
  };
}

function createSurveyNotification(recipient: ConciergeRecipient): ConciergeNotification {
  return {
    id: `survey-${recipient.id}`,
    recipientId: recipient.id,
    title: `Givit survey for ${recipient.name}`,
    body: `Five weeks before ${recipient.occasion}, answer the Givit survey so AI can pick the best gift box, card, flowers/add-ons, or experience.`,
    scheduledFor: getSurveyDate(recipient.occasionDate),
    channel: "in_app",
    status: "scheduled",
    kind: "survey",
  };
}

function createApprovalNotification(recipient: ConciergeRecipient, approval: GiftApproval): ConciergeNotification {
  return {
    id: `approval-${approval.id}`,
    recipientId: recipient.id,
    title: `Approve ${recipient.name}'s gift box`,
    body: "Review the full AI gift box. Givit will not charge or order until you approve it.",
    scheduledFor: getApprovalDate(recipient.occasionDate),
    channel: "in_app",
    status: "scheduled",
    kind: "approval",
  };
}

function chooseBundleItems(recipient: ConciergeRecipient, surveyAnswers: string): GiftBundleItem[] {
  const budgetCents = centsFromBudget(recipient.budget);
  const hasExperienceSignal = /ticket|game|music|concert|experience|travel|sports|show|event/i.test(`${recipient.interests} ${surveyAnswers}`);
  const wantsFlowers = /flower|romantic|mom|mother|anniversary|birthday|garden|bright|bouquet/i.test(`${recipient.relationship} ${recipient.occasion} ${recipient.interests} ${surveyAnswers}`);
  const mainGiftCents = Math.max(2500, Math.round(budgetCents * (hasExperienceSignal ? 0.78 : wantsFlowers ? 0.55 : 0.7)));
  const items: GiftBundleItem[] = hasExperienceSignal
    ? [
        { label: "Experience", description: "AI-selected digital tickets, local experience, or event credit matched to the survey answers and delivery date.", priceCents: mainGiftCents, type: "experience" },
        { label: "Card", description: "Personal note delivered digitally or handwritten by the admin/card queue.", priceCents: 700, type: "card" },
        { label: "Service", description: "Ordering coordination, approval tracking, and fulfillment routing.", priceCents: 995, type: "service" },
      ]
    : [
        { label: "Main gift", description: "AI-selected marketplace, handmade seller, or approved external-site item based on the Givit survey.", priceCents: mainGiftCents, type: "gift" },
        { label: "Card", description: "Handwritten card with AI-drafted message sent through the admin/card queue.", priceCents: 700, type: "card" },
        { label: wantsFlowers ? "Flowers" : "Add-on", description: wantsFlowers ? "Bouquet selected for the occasion and delivery window." : "Small add-on chosen to make the gift box feel complete.", priceCents: wantsFlowers ? 2400 : 1400, type: "flowers" },
        { label: "Shipping", description: "Tracked delivery with a buffer before the occasion.", priceCents: 995, type: "shipping" },
      ];

  return items;
}

function createApproval(recipient: ConciergeRecipient, surveyAnswers: string): GiftApproval {
  const items = chooseBundleItems(recipient, surveyAnswers);
  const fulfillmentTasks = items.map((item) => {
    if (item.type === "card") return "Send card copy to the admin/card queue.";
    if (item.type === "flowers") return CONCIERGE_AUTOMATION_CONFIG.providers.flowers === "provider" ? "Place florist-provider order after approval." : "Send flower/add-on order to the admin queue.";
    if (item.type === "experience") return "Reserve ticket or digital experience through the approved fulfillment queue.";
    if (item.type === "shipping") return CONCIERGE_AUTOMATION_CONFIG.providers.shipping === "shippo" ? "Create Shippo shipment after seller/provider order." : "Create shipment task for operations.";
    if (CONCIERGE_AUTOMATION_CONFIG.providers.externalCheckout === "browser_agent") return "Run approved external checkout browser agent after payment succeeds.";
    return "Send seller or external-site order to the admin queue.";
  });

  return {
    id: `approval-${recipient.id}-${Date.now()}`,
    recipientId: recipient.id,
    status: "needs_approval",
    headline: `${recipient.name}'s ${recipient.occasion} gift box`,
    rationale: `The Givit survey combined ${recipient.relationship}, budget ${recipient.budget}, interests (${recipient.interests}), avoid list (${recipient.avoid || "none"}), and answers (${surveyAnswers}) to choose a complete bundle that can arrive before ${formatConciergeDate(recipient.occasionDate)}.`,
    message: `${recipient.name}, this was picked to feel personal to what you enjoy. I hope it makes your ${recipient.occasion.toLowerCase()} feel thoughtful, easy, and special.`,
    estimatedDelivery: getEstimatedDeliveryDate(recipient.occasionDate),
    items,
    fulfillmentTasks,
  };
}

function statusTone(status: GiftApproval["status"]) {
  if (status === "approved" || status === "ordered") return "bg-emerald-600 text-white";
  if (status === "needs_approval") return "bg-givit-ember text-white";
  if (status === "regenerating") return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

export function ConciergeDashboard() {
  const [state, setState] = useState<ConciergeState>(() => readState());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window !== "undefined" && "Notification" in window) return window.Notification.permission;
    return "unsupported";
  });
  const [surveyAnswersByRecipient, setSurveyAnswersByRecipient] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const setupScore = useMemo(() => {
    let score = 0;
    if (state.profile.serviceConfirmed && state.profile.automationEnabled) score += 25;
    if (state.profile.addressStatus === "ready") score += 25;
    if (state.profile.paymentStatus === "ready") score += 25;
    if (state.recipients.length > 0) score += 25;
    return score;
  }, [state]);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      toast.warning("Browser push notifications are not supported in this environment.");
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      new window.Notification("Givit notifications are ready", {
        body: `Your Givit survey reminders are scheduled ${SURVEY_LEAD_DAYS} days before each date.`,
      });
      toast.success("Push notifications enabled.");
    }
  }

  function toggleService() {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        automationEnabled: !current.profile.automationEnabled,
        serviceConfirmed: true,
      },
    }));
  }

  function markPaymentReady(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const stripePaymentMethodId = String(formData.get("stripePaymentMethodId") ?? "").trim();
    if (!stripePaymentMethodId) {
      toast.error("Save a Stripe payment method ID from the card setup flow before enabling ordering.");
      return;
    }
    setState((current) => ({ ...current, profile: { ...current.profile, paymentStatus: "ready", stripePaymentMethodId } }));
    toast.success("Payment method token saved. Raw card numbers stay in Stripe, not Givit.");
  }

  function addRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const recipient = createRecipient(new FormData(form));
    if (!recipient.name || !recipient.occasion || !recipient.occasionDate || !recipient.budget || !recipient.addressLine1) {
      toast.error("Name, occasion, date, budget, and delivery address are required.");
      return;
    }
    const notification = createSurveyNotification(recipient);
    setState((current) => ({
      ...current,
      profile: { ...current.profile, addressStatus: "ready" },
      recipients: [...current.recipients, recipient],
      notifications: [notification, ...current.notifications],
    }));
    form.reset();
    toast.success(`Saved ${recipient.name}. Givit survey notification scheduled for ${formatConciergeDate(notification.scheduledFor)}.`);
  }

  function submitSurvey(recipient: ConciergeRecipient) {
    const answers = surveyAnswersByRecipient[recipient.id]?.trim();
    if (!answers) {
      toast.error("Add survey answers before generating the gift box.");
      return;
    }
    const approval = createApproval(recipient, answers);
    const approvalNotification = createApprovalNotification(recipient, approval);
    setState((current) => ({
      ...current,
      recipients: current.recipients.map((item) => item.id === recipient.id ? { ...item, surveyStatus: "completed" } : item),
      approvals: [approval, ...current.approvals],
      notifications: [
        approvalNotification,
        ...current.notifications.map((notification) => notification.id === `survey-${recipient.id}` ? { ...notification, status: "sent" as const } : notification),
      ],
    }));
    toast.success("Givit survey completed and AI gift box generated for approval.");
  }

  function updateApproval(id: string, status: GiftApproval["status"]) {
    setState((current) => ({
      ...current,
      approvals: current.approvals.map((approval) => approval.id === id ? { ...approval, status } : approval),
      notifications: current.notifications.map((notification) =>
        notification.recipientId === current.approvals.find((approval) => approval.id === id)?.recipientId && notification.kind === "approval"
          ? { ...notification, status: status === "approved" ? "approved" : notification.status }
          : notification,
      ),
    }));
    toast.success(status === "approved" ? "Approved. Stripe charging and fulfillment tasks can now run." : "Bundle queued for regeneration.");
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-givit-ink p-6 text-white md:p-8">
          <Badge className="mb-4 bg-givit-ember text-white">Givit notification autopilot</Badge>
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-5xl">
            Log in, turn on reminders, and approve the final gift box.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
            Add dates, names, a Stripe payment token, delivery address, and service preference. Five weeks before each date, Givit sends a survey notification, creates the full gift box, and waits for approval before it charges or orders.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={requestNotifications} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Bell className="h-4 w-4" /> Enable notifications
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/login?next=/concierge"><ExternalLink className="h-4 w-4" /> Log in first</Link>
            </Button>
          </div>
        </div>
        <Card className="border-givit-ember/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Setup readiness <span className="text-givit-ember">{setupScore}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-givit-ember transition-all" style={{ width: `${setupScore}%` }} />
            </div>
            <Button onClick={toggleService} variant={state.profile.automationEnabled ? "default" : "outline"} className={state.profile.automationEnabled ? "w-full bg-emerald-600 text-white hover:bg-emerald-700" : "w-full"}>
              {state.profile.automationEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} Service {state.profile.automationEnabled ? "on" : "off"}
            </Button>
            <form onSubmit={markPaymentReady} className="space-y-2">
              <Label htmlFor="stripePaymentMethodId">Stripe payment method ID</Label>
              <Input id="stripePaymentMethodId" name="stripePaymentMethodId" placeholder="pm_... from Stripe Elements" defaultValue={state.profile.stripePaymentMethodId} />
              <Button type="submit" variant="outline" className="w-full"><CreditCard className="h-4 w-4" /> Save payment token</Button>
            </form>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between"><span>Payment token</span><Badge variant="outline">{state.profile.paymentStatus.replace("_", " ")}</Badge></div>
              <div className="flex items-center justify-between"><span>Address defaults</span><Badge variant="outline">{state.profile.addressStatus}</Badge></div>
              <div className="flex items-center justify-between"><span>Push permission</span><Badge variant="outline">{notificationPermission}</Badge></div>
              <div className="flex items-center justify-between"><span>People tracked</span><Badge variant="outline">{state.recipients.length}</Badge></div>
            </div>
            <p className="rounded-2xl bg-givit-sand p-3 text-xs leading-5 text-muted-foreground">
              Config: survey lead {CONCIERGE_AUTOMATION_CONFIG.surveyLeadDays} days, approval lead {CONCIERGE_AUTOMATION_CONFIG.approvalLeadDays} days, checkout route {CONCIERGE_AUTOMATION_CONFIG.providers.externalCheckout}.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {CONCIERGE_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember"><Icon className="h-4 w-4" /></span>
                  <Badge variant="outline">{index + 1}</Badge>
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-givit-ember" /> Add date, person, card, and address</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRecipient} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="name">Person&apos;s name</Label><Input id="name" name="name" required /></div>
                <div className="space-y-2"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" name="relationship" required /></div>
                <div className="space-y-2"><Label htmlFor="occasion">Occasion</Label><Input id="occasion" name="occasion" required /></div>
                <div className="space-y-2"><Label htmlFor="occasionDate">Date</Label><Input id="occasionDate" name="occasionDate" type="date" required /></div>
                <div className="space-y-2"><Label htmlFor="budget">Budget</Label><Input id="budget" name="budget" inputMode="decimal" required /></div>
                <div className="space-y-2"><Label htmlFor="deliveryPreference">Delivery preference</Label><select id="deliveryPreference" name="deliveryPreference" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="ship">Ship</option><option value="email">Email/digital</option><option value="either">Either</option></select></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="addressLine1">Street address</Label><Input id="addressLine1" name="addressLine1" required /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="addressLine2">Apartment, suite, or delivery note</Label><Input id="addressLine2" name="addressLine2" /></div>
                <div className="space-y-2"><Label htmlFor="city">City</Label><Input id="city" name="city" required /></div>
                <div className="space-y-2"><Label htmlFor="state">State</Label><Input id="state" name="state" required /></div>
                <div className="space-y-2"><Label htmlFor="postalCode">ZIP / postal code</Label><Input id="postalCode" name="postalCode" required /></div>
                <div className="space-y-2"><Label htmlFor="country">Country</Label><Input id="country" name="country" defaultValue="US" required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="interests">Known interests</Label><Textarea id="interests" name="interests" required /></div>
              <div className="space-y-2"><Label htmlFor="avoid">Avoid</Label><Input id="avoid" name="avoid" /></div>
              <Button type="submit" className="w-full bg-givit-ember text-white hover:bg-givit-ember-hover"><Send className="h-4 w-4" /> Save and schedule five-week survey</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {state.recipients.map((recipient) => {
              const DeliveryIcon = deliveryIcon(recipient.deliveryPreference);
              const days = getDaysUntil(recipient.occasionDate);
              return (
                <Card key={recipient.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{recipient.name}</h3>
                        <p className="text-sm text-muted-foreground">{recipient.relationship} · {recipient.occasion}</p>
                      </div>
                      <Badge className={days <= 35 ? "bg-givit-ember text-white" : ""}>{days} days</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><DeliveryIcon className="h-4 w-4 text-givit-ember" /> {recipient.addressLabel}</div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground"><strong>Survey:</strong> {recipient.surveyStatus} · scheduled {formatConciergeDate(getSurveyDate(recipient.occasionDate))}</p>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`survey-${recipient.id}`}>Givit survey answers</Label>
                      <Textarea id={`survey-${recipient.id}`} value={surveyAnswersByRecipient[recipient.id] ?? ""} onChange={(event) => setSurveyAnswersByRecipient((current) => ({ ...current, [recipient.id]: event.target.value }))} />
                      <Button type="button" onClick={() => submitSurvey(recipient)} variant="outline" className="w-full"><PlayCircle className="h-4 w-4" /> Generate gift box</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {state.recipients.length === 0 ? <p className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">No saved people yet. Add a real recipient above to schedule the five-week Givit survey.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-bold">Approval queue</h2>
            <Badge variant="outline">{state.approvals.filter((approval) => approval.status === "needs_approval").length} need review</Badge>
          </div>
          {state.approvals.map((approval) => {
            const recipient = state.recipients.find((item) => item.id === approval.recipientId);
            return (
              <Card key={approval.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b bg-givit-sand/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge className={statusTone(approval.status)}>{approval.status.replace("_", " ")}</Badge>
                        <h3 className="mt-2 text-lg font-semibold">{approval.headline}</h3>
                        <p className="text-sm text-muted-foreground">For {recipient?.name ?? "recipient"} · arrives by {formatConciergeDate(approval.estimatedDelivery)}</p>
                      </div>
                      <div className="text-right"><p className="text-xs uppercase tracking-wide text-muted-foreground">Bundle total</p><p className="text-xl font-bold text-givit-ember">{formatCents(getBundleTotal(approval.items))}</p></div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{approval.rationale}</p>
                  </div>
                  <div className="grid gap-4 p-4 md:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-2">
                      {approval.items.map((item) => {
                        const Icon = iconForBundleItem(item.type);
                        return (
                          <div key={`${approval.id}-${item.label}`} className="flex gap-3 rounded-2xl border p-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-givit-ember/10 text-givit-ember"><Icon className="h-4 w-4" /></span>
                            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.label} · {formatCents(item.priceCents)}</p><p className="text-xs leading-5 text-muted-foreground">{item.description}</p></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-givit-ember">Card message</p>
                      <p className="mt-2 text-sm leading-6">“{approval.message}”</p>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-givit-ember">Fulfillment after approval</p>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                        {approval.fulfillmentTasks.map((task) => <li key={task}>• {task}</li>)}
                      </ul>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                        <Button onClick={() => updateApproval(approval.id, "approved")} disabled={!state.profile.automationEnabled || state.profile.paymentStatus !== "ready"} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> Approve</Button>
                        <Button onClick={() => updateApproval(approval.id, "regenerating")} variant="outline"><X className="h-4 w-4" /> Regenerate</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {state.approvals.length === 0 ? <p className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">Approval boxes appear after the Givit survey is completed from a notification.</p> : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-givit-ember" /> Notification schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {state.notifications.map((notification) => {
                const recipient = state.recipients.find((item) => item.id === notification.recipientId);
                return (
                  <div key={notification.id} className="rounded-2xl border p-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{notification.title}</p><Badge variant="outline">{notification.kind}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{recipient?.name ?? "Recipient"} · {formatConciergeDate(notification.scheduledFor)} · {notification.status}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                  </div>
                );
              })}
              {state.notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications scheduled yet.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-givit-ember" /> Automation guardrails</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {AUTOMATION_RULES.map((rule) => <li key={rule} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {rule}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
