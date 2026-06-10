import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Category, Order, OrderItem, Product, ProductImage, SellerOrder } from "@/types/database";

const productSelect = `
  *,
  category:categories (*),
  images:product_images (*)
`;

async function getViewerRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role as string | undefined };
}

export const getAdminProducts = cache(async () => {
  const supabase = await createClient();
  const { user } = await getViewerRole(supabase);

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("seller_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as (Product & {
    category: Category | null;
    images: ProductImage[];
  })[];
});

export const getAdminProduct = cache(async (id: string) => {
  const supabase = await createClient();
  const { user } = await getViewerRole(supabase);

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();
  if (error) throw error;
  return data as Product & {
    category: Category | null;
    images: ProductImage[];
  };
});

export type AdminSellerOrderRow = SellerOrder & {
  order: Order;
};

export const getAdminSellerOrders = cache(async () => {
  const supabase = await createClient();
  const { user, role } = await getViewerRole(supabase);

  let query = supabase
    .from("seller_orders")
    .select("*, order:orders(*)")
    .order("created_at", { ascending: false });

  if (role !== "admin") {
    query = query.eq("seller_id", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AdminSellerOrderRow[];
});

export const getAdminOrderDetail = cache(async (orderId: string) => {
  const supabase = await createClient();
  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (oErr) throw oErr;
  const { data: items, error: iErr } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (iErr) throw iErr;
  return {
    order: order as Order,
    items: items as OrderItem[],
  };
});

export type AdminGiftApprovalRow = {
  id: string;
  status: string;
  headline: string;
  card_message: string | null;
  total_cents: number;
  estimated_delivery_date: string | null;
  approved_at: string | null;
  recipient: {
    name: string;
    ship_to_name: string | null;
    ship_to_line1: string | null;
    ship_to_line2: string | null;
    ship_to_city: string | null;
    ship_to_state: string | null;
    ship_to_zip: string | null;
    ship_to_country: string;
  } | null;
  gift_approval_items: {
    id: string;
    item_type: string;
    title: string;
    description: string | null;
    external_url: string | null;
    fulfillment_status: string;
  }[];
  gift_fulfillment_tasks: {
    id: string;
    task_type: string;
    provider: string | null;
    status: string;
  }[];
};

export const getAdminGiftApprovals = cache(async () => {
  const supabase = await createClient();
  const { role } = await getViewerRole(supabase);
  if (role !== "admin") return [];

  const { data, error } = await supabase
    .from("gift_approvals")
    .select("id, status, headline, card_message, total_cents, estimated_delivery_date, approved_at, recipient:gift_recipients(name, ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_state, ship_to_zip, ship_to_country), gift_approval_items(id, item_type, title, description, external_url, fulfillment_status), gift_fulfillment_tasks(id, task_type, provider, status)")
    .in("status", ["paid_pending_fulfillment", "ordered", "shipped", "delivered"])
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return data as unknown as AdminGiftApprovalRow[];
});
