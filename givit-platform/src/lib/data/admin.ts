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
