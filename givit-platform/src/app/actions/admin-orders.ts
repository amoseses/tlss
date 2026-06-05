"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role as string | undefined;
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden");
  return { supabase, user, role };
}

export async function updateSellerOrderStatusAction(
  sellerOrderId: string,
  status: OrderStatus,
) {
  const { supabase, user, role } = await requireStaff();
  const allowed: OrderStatus[] = ["pending", "confirmed", "fulfilled", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  let query = supabase.from("seller_orders").update({ status }).eq("id", sellerOrderId);
  if (role !== "admin") {
    query = query.eq("seller_id", user.id);
  }

  const { data, error } = await query.select("order_id").single();
  if (error) throw error;

  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  if (data?.order_id) {
    revalidatePath(`/orders/${data.order_id}`);
  }
}

/** @deprecated Use updateSellerOrderStatusAction */
export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const { supabase } = await requireStaff();
  const allowed: OrderStatus[] = ["pending", "confirmed", "fulfilled", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}
