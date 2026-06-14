import { redirect } from "next/navigation";

import { ConciergeDashboard } from "@/components/gifting/concierge-dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";
import type { ConciergeDashboardData } from "@/lib/gifting/concierge";

export default async function ConciergePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/concierge");

  const [{ data: profile }, { data: recipients }, { data: occasions }, { data: notifications }, { data: approvals }] = await Promise.all([
    supabase.from("profiles").select("gift_automation_enabled, concierge_onboarding_completed, stripe_customer_id, stripe_default_payment_method_id").eq("id", user.id).single(),
    supabase.from("gift_recipients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("gift_occasions").select("*").eq("user_id", user.id).order("occasion_date", { ascending: true }),
    supabase.from("gift_notifications").select("*").eq("user_id", user.id).order("scheduled_for", { ascending: true }).limit(8),
    supabase.from("gift_approvals").select("*, gift_approval_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const occasionMap = new Map<string, NonNullable<typeof occasions>>();
  for (const occasion of occasions ?? []) {
    const list = occasionMap.get(occasion.recipient_id) ?? [];
    list.push(occasion);
    occasionMap.set(occasion.recipient_id, list);
  }

  const data: ConciergeDashboardData = {
    profile: {
      gift_automation_enabled: Boolean(profile?.gift_automation_enabled),
      concierge_onboarding_completed: Boolean(profile?.concierge_onboarding_completed),
      stripe_customer_id: profile?.stripe_customer_id ?? null,
      stripe_default_payment_method_id: profile?.stripe_default_payment_method_id ?? null,
    },
    recipients: (recipients ?? []).map((recipient) => ({ ...recipient, occasions: occasionMap.get(recipient.id) ?? [] })),
    notifications: notifications ?? [],
    approvals: approvals ?? [],
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  } as ConciergeDashboardData;

  return (
    <PageShell>
      <ConciergeDashboard data={data} />
    </PageShell>
  );
}
