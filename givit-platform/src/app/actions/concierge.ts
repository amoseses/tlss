"use server";

import { revalidatePath } from "next/cache";

import { buildGiftBoxRecommendation, DEFAULT_APPROVAL_LEAD_DAYS, DEFAULT_SHIPPING_BUFFER_DAYS, getBundleTotal, getSurveyDate, type GiftBundleItem } from "@/lib/gifting/concierge";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function requireString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key.replaceAll("_", " ")} is required.`);
  return value;
}

function parseBudgetCents(value: FormDataEntryValue | null) {
  const dollars = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 7500;
}

export async function updateConciergeProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const { error } = await supabase
    .from("profiles")
    .update({
      gift_automation_enabled: formData.get("gift_automation_enabled") === "on",
      concierge_onboarding_completed: true,
    })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/concierge");
  revalidatePath("/account");
}

export async function saveConciergeRecipientAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const name = requireString(formData, "name");
  const occasion = requireString(formData, "occasion");
  const occasionDate = requireString(formData, "occasion_date");
  const deliveryPreference = String(formData.get("delivery_preference") ?? "ship");
  const requiresShipping = deliveryPreference === "ship";
  const shipToLine1 = requiresShipping ? requireString(formData, "ship_to_line1") : String(formData.get("ship_to_line1") ?? "").trim();
  const shipToCity = requiresShipping ? requireString(formData, "ship_to_city") : String(formData.get("ship_to_city") ?? "").trim();
  const shipToState = (requiresShipping ? requireString(formData, "ship_to_state") : String(formData.get("ship_to_state") ?? "").trim()).toUpperCase();
  const shipToZip = requiresShipping ? requireString(formData, "ship_to_zip") : String(formData.get("ship_to_zip") ?? "").trim();

  const { data: recipient, error: recipientError } = await supabase
    .from("gift_recipients")
    .insert({
      user_id: user.id,
      name,
      relationship: String(formData.get("relationship") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      default_budget_cents: parseBudgetCents(formData.get("budget")),
      interests: splitList(formData.get("interests")),
      avoid_terms: splitList(formData.get("avoid_terms")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      ship_to_name: name,
      ship_to_line1: shipToLine1 || null,
      ship_to_line2: String(formData.get("ship_to_line2") ?? "").trim() || null,
      ship_to_city: shipToCity || null,
      ship_to_state: shipToState || null,
      ship_to_zip: shipToZip || null,
      ship_to_country: String(formData.get("ship_to_country") ?? "US").trim() || "US",
      delivery_preference: deliveryPreference,
      automation_enabled: formData.get("recipient_automation_enabled") === "on",
    })
    .select("id")
    .single();
  if (recipientError || !recipient) throw recipientError ?? new Error("Could not save recipient.");

  const { data: occasionRow, error: occasionError } = await supabase
    .from("gift_occasions")
    .insert({
      user_id: user.id,
      recipient_id: recipient.id,
      occasion,
      occasion_date: occasionDate,
      repeats_yearly: formData.get("repeats_yearly") !== "off",
      approval_lead_days: DEFAULT_APPROVAL_LEAD_DAYS,
      shipping_buffer_days: DEFAULT_SHIPPING_BUFFER_DAYS,
      status: "active",
    })
    .select("id")
    .single();
  if (occasionError || !occasionRow) throw occasionError ?? new Error("Could not save occasion.");

  await supabase.from("gift_notifications").insert({
    user_id: user.id,
    recipient_id: recipient.id,
    occasion_id: occasionRow.id,
    title: `GivIt Survey for ${name}`,
    body: `Five weeks before ${occasion}, complete the tailored GivIt Survey so the AI concierge can build a gift box.`,
    channel: "in_app",
    scheduled_for: `${getSurveyDate(occasionDate)}T09:00:00.000Z`,
    status: "scheduled",
    metadata: { href: `/concierge?recipient=${recipient.id}&occasion=${occasionRow.id}#survey`, kind: "survey" },
  });

  await supabase.from("profiles").update({ concierge_onboarding_completed: true }).eq("id", user.id);
  revalidatePath("/concierge");
  revalidatePath("/account");
}

export async function updateRecipientAutomationAction(recipientId: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");
  const { error } = await supabase.from("gift_recipients").update({ automation_enabled: enabled }).eq("id", recipientId).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/concierge");
}

export async function generateGiftApprovalAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const recipientId = requireString(formData, "recipient_id");
  const occasionId = requireString(formData, "occasion_id");
  const { data: recipient, error: recipientError } = await supabase.from("gift_recipients").select("*").eq("id", recipientId).eq("user_id", user.id).single();
  if (recipientError || !recipient) throw recipientError ?? new Error("Recipient not found.");
  const { data: occasion, error: occasionError } = await supabase.from("gift_occasions").select("*").eq("id", occasionId).eq("user_id", user.id).single();
  if (occasionError || !occasion) throw occasionError ?? new Error("Occasion not found.");

  const box = buildGiftBoxRecommendation({
    recipientName: recipient.name,
    relationship: recipient.relationship ?? "",
    occasion: occasion.occasion,
    occasionDate: occasion.occasion_date,
    interests: recipient.interests ?? [],
    avoidTerms: recipient.avoid_terms ?? [],
    budgetCents: parseBudgetCents(formData.get("budget") || String(recipient.default_budget_cents / 100)),
    style: String(formData.get("style") ?? ""),
    surveyAnswers: String(formData.get("survey_answers") ?? ""),
    deliveryPreference: recipient.delivery_preference,
    regenerationNote: String(formData.get("regeneration_note") ?? ""),
  });

  const existingApprovalId = String(formData.get("approval_id") ?? "").trim();
  if (existingApprovalId) {
    await supabase.from("gift_approval_items").delete().eq("approval_id", existingApprovalId);
    const { error: updateError } = await supabase
      .from("gift_approvals")
      .update({
        status: "needs_approval",
        headline: box.headline,
        rationale: box.rationale,
        card_message: box.card_message,
        total_cents: box.total_cents,
        estimated_delivery_date: box.estimated_delivery_date,
        regenerated_at: new Date().toISOString(),
      })
      .eq("id", existingApprovalId)
      .eq("user_id", user.id);
    if (updateError) throw updateError;
    await insertApprovalItems(existingApprovalId, box.items);
  } else {
    const { data: approval, error: approvalError } = await supabase
      .from("gift_approvals")
      .insert({
        user_id: user.id,
        recipient_id: recipient.id,
        occasion_id: occasion.id,
        status: "needs_approval",
        headline: box.headline,
        rationale: box.rationale,
        card_message: box.card_message,
        total_cents: box.total_cents,
        estimated_delivery_date: box.estimated_delivery_date,
      })
      .select("id")
      .single();
    if (approvalError || !approval) throw approvalError ?? new Error("Could not create approval.");
    await insertApprovalItems(approval.id, box.items);
  }

  await supabase.from("gift_notifications").update({ status: "sent" }).eq("occasion_id", occasion.id).eq("user_id", user.id).eq("status", "scheduled");
  revalidatePath("/concierge");

  async function insertApprovalItems(approvalId: string, items: GiftBundleItem[]) {
    const { error } = await supabase.from("gift_approval_items").insert(items.map((item) => ({
      approval_id: approvalId,
      product_id: item.product_id ?? null,
      seller_id: item.seller_id ?? null,
      item_type: item.item_type,
      title: item.title,
      description: item.description,
      price_cents: item.price_cents,
      external_url: item.external_url,
      metadata: item.metadata ?? {},
    })));
    if (error) throw error;
  }
}

export async function removeGiftApprovalItemAction(approvalId: string, itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const { data: approval, error: approvalError } = await supabase
    .from("gift_approvals")
    .select("id, status, gift_approval_items(id, price_cents)")
    .eq("id", approvalId)
    .eq("user_id", user.id)
    .single();
  if (approvalError || !approval) throw approvalError ?? new Error("Approval not found.");
  if (approval.status !== "needs_approval") throw new Error("Only pending approvals can be edited.");

  const items = (approval.gift_approval_items ?? []) as Array<{ id: string; price_cents: number }>;
  if (items.length <= 1) throw new Error("A gift box needs at least one item.");
  if (!items.some((item) => item.id === itemId)) throw new Error("Item not found.");

  const { error: deleteError } = await supabase.from("gift_approval_items").delete().eq("id", itemId).eq("approval_id", approvalId);
  if (deleteError) throw deleteError;

  const totalCents = items.filter((item) => item.id !== itemId).reduce((total, item) => total + item.price_cents, 0);
  const { error: updateError } = await supabase.from("gift_approvals").update({ total_cents: totalCents }).eq("id", approvalId).eq("user_id", user.id);
  if (updateError) throw updateError;

  revalidatePath("/concierge");
}

export async function approveGiftApprovalAction(approvalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("stripe_customer_id, stripe_default_payment_method_id").eq("id", user.id).single();
  if (profileError || !profile) throw profileError ?? new Error("Profile not found.");
  if (!profile.stripe_customer_id || !profile.stripe_default_payment_method_id) throw new Error("Add a Stripe payment method before approval.");

  const { data: approval, error: approvalError } = await supabase
    .from("gift_approvals")
    .select("*, gift_approval_items(*)")
    .eq("id", approvalId)
    .eq("user_id", user.id)
    .single();
  if (approvalError || !approval) throw approvalError ?? new Error("Approval not found.");
  if (approval.status !== "needs_approval") throw new Error("Only pending approvals can be ordered.");

  const items = (approval.gift_approval_items ?? []) as Array<{ id: string; item_type: string; price_cents: number; title: string; external_url: string | null }>;
  const totalCents = getBundleTotal(items);
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "usd",
    customer: profile.stripe_customer_id,
    payment_method: profile.stripe_default_payment_method_id,
    off_session: true,
    confirm: true,
    metadata: { user_id: user.id, gift_approval_id: approvalId, pipeline: "givit_concierge" },
  });

  await supabase
    .from("gift_approvals")
    .update({ status: "paid_pending_fulfillment", approved_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent.id, total_cents: totalCents })
    .eq("id", approvalId)
    .eq("user_id", user.id);

  const taskRows = items.flatMap((item) => taskTypesForItem(item.item_type).map((taskType) => ({
    approval_id: approvalId,
    item_id: item.id,
    task_type: taskType,
    provider: providerForTask(taskType),
    status: "queued",
    metadata: { item_title: item.title, source_url: item.external_url },
  })));
  if (taskRows.length > 0) await supabase.from("gift_fulfillment_tasks").insert(taskRows);

  revalidatePath("/concierge");
  revalidatePath("/admin/orders");
}

function taskTypesForItem(itemType: string) {
  if (itemType === "card") return ["card_writer"];
  if (itemType === "flowers") return ["florist"];
  if (itemType === "experience") return ["ticket_transfer"];
  if (itemType === "shipping") return ["shipment"];
  if (itemType === "gift") return ["affiliate_checkout"];
  return [];
}

function providerForTask(taskType: string) {
  if (taskType === "florist") return process.env.NEXT_PUBLIC_FLORIST_PROVIDER_ENABLED === "true" ? "florist_provider" : "admin_queue";
  if (taskType === "affiliate_checkout") return process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT === "true" ? "browser_agent" : "admin_queue";
  if (taskType === "shipment") return process.env.NEXT_PUBLIC_SHIPPO_ENABLED === "true" ? "shippo" : "admin_queue";
  return "admin_queue";
}
