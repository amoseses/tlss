"use server";

import { revalidatePath } from "next/cache";

import { getAppUrl } from "@/lib/env/commerce";
import { syncConnectAccount } from "@/lib/commerce/fulfill";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

async function requireSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, stripe_connect_account_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden");

  return { supabase, user, profile };
}

export async function createStripeConnectLinkAction(): Promise<{ url: string }> {
  const { supabase, user, profile } = await requireSeller();
  const stripe = getStripe();
  const appUrl = getAppUrl();

  let accountId = profile?.stripe_connect_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile?.email ?? undefined,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        profile_id: user.id,
      },
    });
    accountId = account.id;

    await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_charges_enabled: Boolean(account.charges_enabled),
      })
      .eq("id", user.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/admin/shipping?connect=refresh`,
    return_url: `${appUrl}/admin/shipping?connect=return`,
    type: "account_onboarding",
  });

  revalidatePath("/admin/shipping");
  return { url: accountLink.url };
}

export async function refreshStripeConnectStatusAction(): Promise<{
  chargesEnabled: boolean;
}> {
  const { profile } = await requireSeller();
  const accountId = profile?.stripe_connect_account_id as string | null;
  if (!accountId) {
    return { chargesEnabled: false };
  }

  await syncConnectAccount(accountId);

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  revalidatePath("/admin/shipping");
  return { chargesEnabled: Boolean(account.charges_enabled) };
}

export async function updateShipFromAddressAction(input: {
  ship_from_line1: string;
  ship_from_line2: string;
  ship_from_city: string;
  ship_from_state: string;
  ship_from_zip: string;
}) {
  const { supabase, user } = await requireSeller();

  const state = input.ship_from_state.trim().toUpperCase();
  const zip = input.ship_from_zip.trim();

  if (!input.ship_from_line1.trim()) throw new Error("Street address is required.");
  if (!input.ship_from_city.trim()) throw new Error("City is required.");
  if (state.length !== 2) throw new Error("Use a two-letter state code.");
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new Error("Enter a valid US ZIP code.");

  const { error } = await supabase
    .from("profiles")
    .update({
      ship_from_line1: input.ship_from_line1.trim(),
      ship_from_line2: input.ship_from_line2.trim() || null,
      ship_from_city: input.ship_from_city.trim(),
      ship_from_state: state,
      ship_from_zip: zip,
      ship_from_country: "US",
    })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/admin/shipping");
}
