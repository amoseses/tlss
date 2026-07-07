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
  const { data } = await supabase
    .from("gift_recipients")
    .select("*, gift_occasions(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
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
  const { data, error } = await supabase.from("user_payment_methods").upsert(paymentMethod).select().single();
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
// GIFT BOARDS
// ============================================================
export async function getPublicBoards() {
  const supabase = getDb();
  // gift_boards.user_id references auth.users, not profiles, so PostgREST
  // can't auto-embed profiles(...) here — fetch owner names separately.
  const { data: boards } = await supabase
    .from("gift_boards")
    .select("*, gift_board_items(*)")
    .eq("is_public", true)
    .order("likes", { ascending: false });
  if (!boards || boards.length === 0) return [];

  const userIds = Array.from(new Set(boards.map((b: any) => b.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return boards.map((b: any) => ({ ...b, profiles: { full_name: nameById.get(b.user_id) ?? null } }));
}

export async function getUserBoards(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("gift_boards")
    .select("*, gift_board_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addBoardItem(item: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_board_items").insert(item).select().single();
  return { data, error };
}

export async function getUserBoardsFromDb(userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("gift_boards")
    .select("*, gift_board_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function saveBoard(board: Record<string, unknown>) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_boards").upsert(board).select().single();
  return { data, error };
}

export async function saveBoardsToDb(userId: string, boards: any[]) {
  const supabase = getDb();
  // Save/update boards
  for (const board of boards) {
    await supabase.from("gift_boards").upsert({
      id: board.id,
      user_id: userId,
      title: board.title,
      description: board.description,
      cover_image: board.coverImage,
      is_public: board.isPublic ?? false,
      likes: board.likes,
    });
  }
}

// ============================================================
// GIFT BOARD LIKES + COMMENTS
// ============================================================
export async function getBoardLikeCounts(boardIds: string[]): Promise<Record<string, number>> {
  if (boardIds.length === 0) return {};
  const supabase = getDb();
  const { data } = await supabase.from("gift_board_likes").select("board_id").in("board_id", boardIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.board_id] = (counts[row.board_id] ?? 0) + 1;
  return counts;
}

export async function getUserLikedBoardIds(userId: string, boardIds: string[]): Promise<Set<string>> {
  if (boardIds.length === 0) return new Set();
  const supabase = getDb();
  const { data } = await supabase.from("gift_board_likes").select("board_id").eq("user_id", userId).in("board_id", boardIds);
  return new Set((data ?? []).map((row: any) => row.board_id));
}

export async function toggleBoardLike(boardId: string, userId: string, currentlyLiked: boolean) {
  const supabase = getDb();
  if (currentlyLiked) {
    const { error } = await supabase.from("gift_board_likes").delete().eq("board_id", boardId).eq("user_id", userId);
    return { liked: false, error };
  }
  const { error } = await supabase.from("gift_board_likes").insert({ board_id: boardId, user_id: userId });
  return { liked: true, error };
}

export async function getBoardComments(boardId: string) {
  const supabase = getDb();
  const { data: comments } = await supabase
    .from("gift_board_comments")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (!comments || comments.length === 0) return [];

  const userIds = Array.from(new Set(comments.map((c: any) => c.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return comments.map((c: any) => ({ ...c, author_name: nameById.get(c.user_id) ?? "Givit user" }));
}

export async function addBoardComment(boardId: string, userId: string, message: string) {
  const supabase = getDb();
  const { data, error } = await supabase.from("gift_board_comments").insert({ board_id: boardId, user_id: userId, message }).select().single();
  return { data, error };
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
  const { data, error } = await supabase.from("autogift_orders").insert({
    id: order.id,
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
