export type UserRole = "customer" | "staff" | "admin";

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: UserRole;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  ship_from_line1: string | null;
  ship_from_line2: string | null;
  ship_from_city: string | null;
  ship_from_state: string | null;
  ship_from_zip: string | null;
  ship_from_country: string;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sku: string;
  price_cents: number;
  weight_oz: number;
  min_order_qty: number;
  stock: number;
  is_published: boolean;
  category_id: string | null;
  seller_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  sort_order: number;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_display_name: string;
  verified_purchase: boolean;
  created_at: string;
};

export type ProductRatingStats = {
  product_id: string;
  avg_rating: string | null;
  review_count: number;
};

export type ProductSalesStats = {
  product_id: string;
  units_sold: number;
  order_count: number;
};

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_cents: number;
  merchandise_cents: number;
  shipping_cents: number;
  tax_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_tax_calculation_id: string | null;
  notes: string | null;
  shipping_company: string | null;
  shipping_address: string | null;
  billing_company: string | null;
  billing_address: string | null;
  ship_to_name: string | null;
  ship_to_line1: string | null;
  ship_to_line2: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  ship_to_country: string;
  created_at: string;
};

export type SellerOrder = {
  id: string;
  order_id: string;
  seller_id: string;
  status: OrderStatus;
  merchandise_cents: number;
  shipping_cents: number;
  tax_cents: number;
  platform_fee_cents: number;
  seller_payout_cents: number;
  shipping_carrier: string | null;
  shipping_service: string | null;
  shippo_shipment_id: string | null;
  shippo_rate_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  seller_order_id: string | null;
  seller_id: string | null;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  product_name: string;
};

export type SellerApplication = {
  id: string;
  user_id: string;
  company_name: string;
  business_description: string | null;
  created_at: string;
};

export type Feedback = {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  message: string;
  created_at: string;
};

// GIVIT extensions
export type MerchantTier = "free" | "basic" | "pro";

export type GiftRecommendation = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  relationship: string | null;
  occasion: string | null;
  interests: string[];
  budget_cents: number;
  tags_matched: string[];
  result_product_ids: string[];
  created_at: string;
};

export type GiftFeedback = {
  id: string;
  recommendation_id: string | null;
  product_id: string;
  user_id: string | null;
  action: "click" | "positive" | "negative" | "purchase";
  created_at: string;
};

export type GiftDeliveryPreference = "ship" | "email" | "either";
export type GiftNotificationChannel = "push" | "email" | "sms" | "in_app";
export type GiftNotificationStatus = "scheduled" | "sent" | "approved" | "skipped" | "failed";
export type GiftApprovalStatus = "draft" | "needs_approval" | "approved" | "regenerating" | "ordered" | "skipped" | "cancelled";
export type GiftApprovalItemType = "gift" | "card" | "flowers" | "experience" | "shipping" | "service";
export type GiftFulfillmentTaskType = "seller_order" | "affiliate_checkout" | "card_writer" | "florist" | "ticket_transfer" | "shipment";
export type GiftFulfillmentStatus = "queued" | "running" | "blocked" | "complete" | "failed";

export type GiftRecipient = {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  default_budget_cents: number;
  interests: string[];
  avoid_terms: string[];
  notes: string | null;
  ship_to_name: string | null;
  ship_to_line1: string | null;
  ship_to_line2: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_zip: string | null;
  ship_to_country: string;
  delivery_preference: GiftDeliveryPreference;
  created_at: string;
  updated_at: string;
};

export type GiftOccasion = {
  id: string;
  user_id: string;
  recipient_id: string;
  occasion: string;
  occasion_date: string;
  repeats_yearly: boolean;
  approval_lead_days: number;
  shipping_buffer_days: number;
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
};

export type GiftNotification = {
  id: string;
  user_id: string;
  recipient_id: string | null;
  occasion_id: string | null;
  title: string;
  body: string;
  channel: GiftNotificationChannel;
  scheduled_for: string;
  sent_at: string | null;
  status: GiftNotificationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GiftApproval = {
  id: string;
  user_id: string;
  recipient_id: string;
  occasion_id: string | null;
  recommendation_id: string | null;
  status: GiftApprovalStatus;
  headline: string;
  rationale: string | null;
  card_message: string | null;
  approval_token: string;
  approved_at: string | null;
  regenerated_at: string | null;
  stripe_payment_intent_id: string | null;
  total_cents: number;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
};

export type GiftApprovalItem = {
  id: string;
  approval_id: string;
  product_id: string | null;
  seller_id: string | null;
  item_type: GiftApprovalItemType;
  title: string;
  description: string | null;
  price_cents: number;
  external_url: string | null;
  fulfillment_status: "pending" | "ordered" | "fulfilled" | "failed" | "cancelled";
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GiftFulfillmentTask = {
  id: string;
  approval_id: string;
  item_id: string | null;
  task_type: GiftFulfillmentTaskType;
  provider: string | null;
  status: GiftFulfillmentStatus;
  run_after: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
