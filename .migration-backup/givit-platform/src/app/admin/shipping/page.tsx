import { SellerShippingForm } from "./seller-shipping-form";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ connect?: string }> };

export default async function AdminShippingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "ship_from_line1, ship_from_line2, ship_from_city, ship_from_state, ship_from_zip, stripe_connect_account_id, stripe_connect_charges_enabled",
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      {sp.connect === "return" ? (
        <div className="border-primary/30 bg-primary/5 rounded-lg border px-4 py-3 text-sm">
          Stripe onboarding updated. If status still shows incomplete, click Refresh status.
        </div>
      ) : null}
      {sp.connect === "refresh" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Stripe session expired — use Connect with Stripe to continue.
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shipping & payouts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure fulfillment origin and Stripe Connect so buyers can check out with live shipping
          rates and tax.
        </p>
      </div>
      <SellerShippingForm
        shipFrom={{
          line1: profile?.ship_from_line1 ?? "",
          line2: profile?.ship_from_line2 ?? "",
          city: profile?.ship_from_city ?? "",
          state: profile?.ship_from_state ?? "",
          zip: profile?.ship_from_zip ?? "",
        }}
        chargesEnabled={Boolean(profile?.stripe_connect_charges_enabled)}
        hasConnectAccount={Boolean(profile?.stripe_connect_account_id)}
      />
    </div>
  );
}
