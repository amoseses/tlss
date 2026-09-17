/**
 * Supabase database helper functions
 * Provides typed access to Supabase tables
 */
import { createClient } from "@/lib/supabase/client";

export function getDb() {
  return createClient();
}

// ============================================================
// PROFILES
// ============================================================
export async function getProfile(userId: string) {
  const supabase = getDb();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
  return { data, error };
}

export async function getAllProfiles() {
  const supabase = getDb();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// PRODUCTS
// ============================================================
export async function getProducts(options?: { published?: boolean; approved?: boolean }) {
  const supabase = getDb();
  let query = supabase.from("products").select("*");
  if (options?.published !== undefined) query = query.eq("is_published", options.published);
  if (options?.approved !== undefined) query = query.eq("is_approved", options.approved);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

export async function getProductById(id: string) {
  const supabase = getDb();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return data;
}

export async function getProductBySlug(slug: string) {
  const supabase = getDb();
  const { data } = await supabase.from("products").select("*").eq("slug", slug).single();
  return data;
}

export async function upsertProduct(product: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("products").upsert(product).select().single();
  return { data, error };
}

export async function deleteProduct(id: string) {
  const supabase = getDb();
  const { error } = await supabase.from("products").delete().eq("id", id);
  return { error };
}

// ============================================================
// ORDERS
// ============================================================
export async function getOrders(options?: { limit?: number }) {
  const supabase = getDb();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);
  return data ?? [];
}

export async function getUserOrders(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// GIFT RECIPIENTS
// ============================================================
export async function getGiftRecipients(userId: string) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("gift_recipients")
    .select("*, gift_occasions(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  // Errors used to be swallowed here (data came back undefined, silently
  // treated as "genuinely zero recipients") -- throwing lets the caller
  // (use-recipients.ts) tell "the fetch failed" apart from "this account
  // really has no saved people yet" and fall back to the local copy
  // instead of confidently rendering an empty list.
  if (error) throw error;
  return data ?? [];
}

export async function deleteGiftRecipient(id: string) {
  const supabase = getDb();
  const { error } = await supabase.from("gift_recipients").delete().eq("id", id);
  return { error };
}

export async function saveGiftRecipient(recipient: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_recipients").upsert(recipient).select().single();
  return { data, error };
}

// ============================================================
// GIFT OCCASIONS
// ============================================================
export async function getGiftOccasions(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("gift_occasions")
    .select("*, gift_recipients(*)")
    .eq("user_id", userId)
    .order("occasion_date", { ascending: true });
  return data ?? [];
}

export async function saveGiftOccasion(occasion: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_occasions").upsert(occasion).select().single();
  return { data, error };
}

export async function deleteGiftOccasion(id: string) {
  const supabase = getDb();
  const { error } = await supabase.from("gift_occasions").delete().eq("id", id);
  return { error };
}

// ============================================================
// GIFT NOTIFICATIONS
// ============================================================
export async function getNotifications(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("gift_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_for", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function createNotification(notification: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_notifications").insert(notification).select().single();
  return { data, error };
}

export async function upsertNotification(notification: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_notifications").upsert(notification).select().single();
  return { data, error };
}

export async function updateNotification(id: string, updates: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_notifications").update(updates).eq("id", id).select().single();
  return { data, error };
}

// ============================================================
// AI LEARNING
// ============================================================
export async function saveAiLearning(userId: string, productSlug: string, weight: number, feedback: string) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("ai_learning")
    .upsert({ user_id: userId, product_slug: productSlug, weight, feedback })
    .select()
    .single();
  return { data, error };
}

export async function getAiLearning(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("ai_learning")
    .select("*")
    .eq("user_id", userId);
  return data ?? [];
}

// ============================================================
// PRODUCT SUBMISSIONS
// ============================================================
export async function submitProduct(submission: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("product_submissions").insert(submission).select().single();
  if (!error || !/schema cache|category|image_url|ai_summary|scraped_metadata/i.test(error.message ?? "")) return { data, error };

  const compatibleSubmission: Record<string, unknown> = { ...submission, description: [submission.description, `AI category: ${submission.category ?? "gift"}`, `Image: ${submission.image_url ?? ""}`].filter(Boolean).join("\n\n") };
  delete compatibleSubmission.category;
  delete compatibleSubmission.image_url;
  delete compatibleSubmission.ai_summary;
  delete compatibleSubmission.scraped_metadata;

  const fallback = await supabase.from("product_submissions").insert(compatibleSubmission).select().single();
  return { data: fallback.data, error: fallback.error };
}

/** Checks the live DB (approved products + pending submissions) for a URL that was already added. */
export async function findDuplicateProductByUrl(normalizedUrl: string): Promise<{ name: string; source: "approved" | "pending" } | null> {
  const supabase = getDb();
  const { data: existingProduct } = await supabase.from("products").select("name").eq("affiliate_url", normalizedUrl).maybeSingle();
  if (existingProduct) return { name: existingProduct.name, source: "approved" };

  const { data: existingSubmission } = await supabase.from("product_submissions").select("name, url").eq("url", normalizedUrl).eq("status", "pending").maybeSingle();
  if (existingSubmission) return { name: existingSubmission.name || existingSubmission.url, source: "pending" };

  return null;
}

export async function getProductSubmissions(status?: string) {
  const supabase = getDb();
  let query = supabase.from("product_submissions").select("*, profiles(full_name, email)");
  if (status) query = query.eq("status", status);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateProductSubmission(id: string, updates: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("product_submissions").update(updates).eq("id", id).select().single();
  return { data, error };
}

// ============================================================
// ANALYTICS
// ============================================================
export async function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  const supabase = getDb();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("analytics_events").insert({
    event_type: eventType,
    user_id: user?.id ?? null,
    metadata: metadata ?? {},
  });
}

export async function getAnalytics() {
  const supabase = getDb();
  const [dauResult, topProductsResult, revenueResult, pendingSubmissionsResult] = await Promise.all([
    supabase.from("analytics_dau").select("*").limit(30),
    supabase.from("analytics_top_products").select("*").limit(10),
    supabase.from("analytics_revenue").select("*").limit(30),
    supabase.from("analytics_pending_submissions").select("*").single(),
  ]);
  return {
    dau: dauResult.data ?? [],
    topProducts: topProductsResult.data ?? [],
    revenue: revenueResult.data ?? [],
    pendingSubmissions: pendingSubmissionsResult.data ?? { pending_count: 0 },
  };
}

// ============================================================
// USER ADDRESSES
// ============================================================
export async function getUserAddresses(userId: string) {
  const supabase = getDb();
  const { data } = await supabase.from("user_addresses").select("*").eq("user_id", userId);
  return data ?? [];
}

export async function saveUserAddress(address: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("user_addresses").upsert(address).select().single();
  return { data, error };
}

export async function deleteUserAddress(userId: string, addressId: string) {
  const supabase = getDb();
  const { error } = await supabase.from("user_addresses").delete().eq("id", addressId).eq("user_id", userId);
  return { error };
}

// ============================================================
// USER PAYMENT METHODS
// ============================================================
export async function getUserPaymentMethods(userId: string) {
  const supabase = getDb();
  const { data } = await supabase.from("user_payment_methods").select("*").eq("user_id", userId);
  return data ?? [];
}

export async function saveUserPaymentMethod(paymentMethod: Record<string, unknown>) {
  const supabase = getDb();
  // onConflict matches the (user_id, stripe_payment_method_id) UNIQUE
  // constraint in admin-schema.sql: without it, re-saving the same card
  // (e.g. retrying after a failed onboarding step) inserts a duplicate row
  // instead of updating the existing one.
  if (paymentMethod.is_default && paymentMethod.user_id) {
    // Only one card can be "the" default -- the charge flow needs an
    // unambiguous card to bill, so clear any other default before setting
    // this one.
    const { error: clearError } = await supabase
      .from("user_payment_methods")
      .update({ is_default: false })
      .eq("user_id", paymentMethod.user_id as string)
      .eq("is_default", true);
    if (clearError) return { data: null, error: clearError };
  }
  const { data, error } = await supabase
    .from("user_payment_methods")
    .upsert(paymentMethod, { onConflict: "user_id,stripe_payment_method_id" })
    .select()
    .single();
  return { data, error };
}

export async function deleteUserPaymentMethod(userId: string, paymentMethodId: string) {
  const supabase = getDb();
  const { error } = await supabase.from("user_payment_methods").delete().eq("id", paymentMethodId).eq("user_id", userId);
  return { error };
}

// ============================================================
// WISHLIST
// ============================================================
export async function getWishlist(userId: string) {
  const supabase = getDb();
  const { data } = await supabase.from("wishlist_items").select("*").eq("user_id", userId).order("priority", { ascending: false });
  return data ?? [];
}

export async function addToWishlist(item: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("wishlist_items").insert(item).select().single();
  return { data, error };
}

export async function removeFromWishlist(id: string) {
  const supabase = getDb();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  return { error };
}

// ============================================================
// AUTOGIFT ORDERS
// ============================================================
export async function saveAutoGiftOrderToDb(order: {
  id: string;
  userId: string;
  recipientName: string;
  occasion: string;
  items: unknown;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: string;
  chargeNote?: string;
  shippingAddress: unknown;
  cardMessage: string;
  customerNotes?: string;
}) {
  const supabase = getDb();
  // order.id is the client-side local id (e.g. "autogift-<uuid>", used to key
  // the browser's own localStorage order list) -- autogift_orders.id is a
  // strict UUID column, so passing that prefixed string through fails with
  // "invalid input syntax for type uuid". Let the column's own
  // gen_random_uuid() default assign the real DB id instead; nothing reads
  // this row back by the local id, so they're fine to differ.
  const { data, error } = await supabase.from("autogift_orders").insert({
    user_id: order.userId,
    recipient_name: order.recipientName,
    occasion: order.occasion,
    items: order.items,
    subtotal_cents: order.subtotal,
    service_fee_cents: order.serviceFee,
    total_cents: order.total,
    status: order.status,
    charge_note: order.chargeNote ?? null,
    shipping_address: order.shippingAddress,
    card_message: order.cardMessage,
    customer_notes: order.customerNotes ?? null,
  }).select().single();
  return { data, error };
}

export async function getUserAutoGiftOrders(userId: string) {
  const supabase = getDb();
  const { data, error } = await supabase.from("autogift_orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) { console.warn("[AutoGift] Could not load user orders from DB:", error.message); return []; }
  return data ?? [];
}

export async function getAllAutoGiftOrdersFromDb() {
  const supabase = getDb();
  const { data, error } = await supabase.from("autogift_orders").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("[AutoGift] Could not load orders from DB (has the migration run?):", error.message); return []; }
  return data ?? [];
}

export async function updateAutoGiftOrderStatusInDb(orderId: string, status: string, adminNotes?: string) {
  const supabase = getDb();
  const updates: Record<string, unknown> = { status };
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (status === "admin_fulfillment") updates.approved_at = new Date().toISOString();
  const { error } = await supabase.from("autogift_orders").update(updates).eq("id", orderId);
  return { error };
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  const supabase = getDb();
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: { message: "Invalid push subscription" } as any };
  }
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: "endpoint" });
  return { error };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = getDb();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { error };
}

export async function getMyPushSubscriptions(userId: string) {
  const supabase = getDb();
  const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (error) { console.warn("[Push] Could not load subscriptions (has the migration run?):", error.message); return []; }
  return data ?? [];
}
