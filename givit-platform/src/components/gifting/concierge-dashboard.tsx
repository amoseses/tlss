"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, CalendarPlus, Check, CreditCard, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
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
  CONCIERGE_STEPS,
  CONCIERGE_STORAGE_KEY,
  DEFAULT_CONCIERGE_STATE,
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

function createRecipient(formData: FormData): ConciergeRecipient {
  const id = `rec-${Date.now()}`;
  return {
    id,
    name: String(formData.get("name") ?? "").trim() || "New recipient",
    relationship: String(formData.get("relationship") ?? "").trim() || "Important person",
    occasion: String(formData.get("occasion") ?? "").trim() || "Gift occasion",
    occasionDate: String(formData.get("occasionDate") ?? "").trim() || new Date().toISOString().slice(0, 10),
    budget: String(formData.get("budget") ?? "").trim() || "$75",
    interests: String(formData.get("interests") ?? "").trim() || "thoughtful, useful, memorable",
    avoid: String(formData.get("avoid") ?? "").trim() || "",
    addressLabel: String(formData.get("addressLabel") ?? "").trim() || "Default address",
    deliveryPreference: "either",
  };
}

function createApproval(recipient: ConciergeRecipient): GiftApproval {
  const deliveryDate = new Date(recipient.occasionDate);
  deliveryDate.setDate(deliveryDate.getDate() - 4);
  const hasExperienceSignal = /ticket|game|music|concert|experience|travel|sports/i.test(recipient.interests);
  return {
    id: `approval-${recipient.id}`,
    recipientId: recipient.id,
    status: "needs_approval",
    headline: hasExperienceSignal ? `${recipient.occasion} experience bundle for ${recipient.name}` : `Complete ${recipient.occasion.toLowerCase()} gift bundle for ${recipient.name}`,
    rationale: `Built from ${recipient.relationship}, ${recipient.budget}, and interests: ${recipient.interests}. Givit includes a main option, card copy, add-ons, delivery buffer, and regeneration path before charging.`,
    message: `${recipient.name}, I wanted this to feel personal and useful. Hope this makes your ${recipient.occasion.toLowerCase()} feel special.` ,
    estimatedDelivery: deliveryDate.toISOString().slice(0, 10),
    items: hasExperienceSignal
      ? [
          { label: "Experience", description: "Digital tickets or experience credit matched to their schedule", priceCents: 8500, type: "experience" },
          { label: "Card", description: "Handwritten note mailed separately or digital note for tickets", priceCents: 700, type: "card" },
          { label: "Service", description: "Fulfillment and delivery coordination", priceCents: 995, type: "shipping" },
        ]
      : [
          { label: "Main gift", description: "Curated marketplace or homemade seller item", priceCents: 4200, type: "gift" },
          { label: "Card", description: "Handwritten message with premium stationery", priceCents: 700, type: "card" },
          { label: "Flowers/Add-on", description: "Optional bouquet, treat, or practical add-on", priceCents: 2400, type: "flowers" },
          { label: "Shipping", description: "Tracked shipping with occasion buffer", priceCents: 995, type: "shipping" },
        ],
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const setupScore = useMemo(() => {
    let score = 0;
    if (state.profile.automationEnabled) score += 25;
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
        body: "We will remind you before approval deadlines. Demo schedules are also shown in-app.",
      });
      toast.success("Push notifications enabled.");
    }
  }

  function markPaymentReady() {
    setState((current) => ({ ...current, profile: { ...current.profile, paymentStatus: "ready" } }));
    toast.success("Payment setup marked ready. In production this is a Stripe SetupIntent flow.");
  }

  function addRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const recipient = createRecipient(new FormData(form));
    const approval = createApproval(recipient);
    setState((current) => ({
      ...current,
      recipients: [...current.recipients, recipient],
      approvals: [approval, ...current.approvals],
      notifications: [
        {
          id: `notif-${recipient.id}`,
          recipientId: recipient.id,
          title: `Approve ${recipient.name}'s ${recipient.occasion} gift`,
          body: "Givit prepared a complete bundle and needs your approval before it charges or orders.",
          scheduledFor: approval.estimatedDelivery,
          channel: "in_app",
          status: "scheduled",
        },
        ...current.notifications,
      ],
    }));
    form.reset();
    toast.success("Recipient added and first approval bundle generated.");
  }

  function updateApproval(id: string, status: GiftApproval["status"]) {
    setState((current) => ({
      ...current,
      approvals: current.approvals.map((approval) => approval.id === id ? { ...approval, status } : approval),
      notifications: current.notifications.map((notification) =>
        notification.recipientId === current.approvals.find((approval) => approval.id === id)?.recipientId
          ? { ...notification, status: status === "approved" ? "approved" : notification.status }
          : notification,
      ),
    }));
    toast.success(status === "approved" ? "Approved. The production flow would charge through Stripe and place the orders." : "Bundle queued for regeneration.");
  }

  function resetDemo() {
    setState(DEFAULT_CONCIERGE_STATE);
    toast.success("Concierge demo reset.");
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-givit-ink p-6 text-white md:p-8">
          <Badge className="mb-4 bg-givit-ember text-white">Givit Autopilot</Badge>
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-5xl">
            Set it up once. Approve gifts when Givit is ready to send.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
            Add dates, people, payment setup, addresses, and notification preferences. Givit generates a complete order plan — gift, handwritten card, flowers or add-ons, shipping, or tickets — then waits for approval before charging.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={requestNotifications} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Bell className="h-4 w-4" /> Enable phone-style alerts
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/gift"><Sparkles className="h-4 w-4" /> Try gift AI</Link>
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
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between"><span>Payment method token</span><Badge variant="outline">{state.profile.paymentStatus.replace("_", " ")}</Badge></div>
              <div className="flex items-center justify-between"><span>Address defaults</span><Badge variant="outline">{state.profile.addressStatus}</Badge></div>
              <div className="flex items-center justify-between"><span>Push permission</span><Badge variant="outline">{notificationPermission}</Badge></div>
              <div className="flex items-center justify-between"><span>People tracked</span><Badge variant="outline">{state.recipients.length}</Badge></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={markPaymentReady} variant="outline"><CreditCard className="h-4 w-4" /> Simulate Stripe setup</Button>
              <Button onClick={resetDemo} variant="ghost"><RotateCcw className="h-4 w-4" /> Reset demo</Button>
            </div>
            <p className="rounded-2xl bg-givit-sand p-3 text-xs leading-5 text-muted-foreground">
              Production note: collect cards with Stripe Elements/SetupIntents. Store only Stripe IDs in Supabase; raw card data never touches the app database.
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
            <CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-givit-ember" /> Add a person/date</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRecipient} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="Avery" /></div>
                <div className="space-y-2"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" name="relationship" placeholder="Sister, friend, client" /></div>
                <div className="space-y-2"><Label htmlFor="occasion">Occasion</Label><Input id="occasion" name="occasion" placeholder="Birthday" /></div>
                <div className="space-y-2"><Label htmlFor="occasionDate">Date</Label><Input id="occasionDate" name="occasionDate" type="date" /></div>
                <div className="space-y-2"><Label htmlFor="budget">Budget</Label><Input id="budget" name="budget" placeholder="$75" /></div>
                <div className="space-y-2"><Label htmlFor="addressLabel">Address / delivery</Label><Input id="addressLabel" name="addressLabel" placeholder="Home, email, office" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="interests">Interests</Label><Textarea id="interests" name="interests" placeholder="coffee, travel, baseball, handmade home goods" /></div>
              <div className="space-y-2"><Label htmlFor="avoid">Avoid</Label><Input id="avoid" name="avoid" placeholder="clutter, sizes, fragile items" /></div>
              <Button type="submit" className="w-full bg-givit-ember text-white hover:bg-givit-ember-hover"><Send className="h-4 w-4" /> Save and generate approval</Button>
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
                      <Badge className={days <= 21 ? "bg-givit-ember text-white" : ""}>{days} days</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><DeliveryIcon className="h-4 w-4 text-givit-ember" /> {recipient.addressLabel}</div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground"><strong>Likes:</strong> {recipient.interests}</p>
                    {recipient.avoid ? <p className="mt-1 text-xs leading-5 text-muted-foreground"><strong>Avoid:</strong> {recipient.avoid}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
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
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                        <Button onClick={() => updateApproval(approval.id, "approved")} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> Approve</Button>
                        <Button onClick={() => updateApproval(approval.id, "regenerating")} variant="outline"><X className="h-4 w-4" /> Regenerate</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-givit-ember" /> Notification schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {state.notifications.map((notification) => {
                const recipient = state.recipients.find((item) => item.id === notification.recipientId);
                return (
                  <div key={notification.id} className="rounded-2xl border p-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{notification.title}</p><Badge variant="outline">{notification.channel}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{recipient?.name ?? "Recipient"} · {formatConciergeDate(notification.scheduledFor)} · {notification.status}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                  </div>
                );
              })}
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
