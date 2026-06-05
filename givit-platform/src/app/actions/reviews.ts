"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function submitReviewAction(input: {
  productId: string;
  productSlug?: string;
  rating: number;
  title?: string;
  body?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to leave a review");

  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating))));

  const { data: userOrders } = await supabase.from("orders").select("id").eq("user_id", user.id);
  const orderIds = (userOrders ?? []).map((o) => o.id as string);

  let verified = false;
  if (orderIds.length > 0) {
    const { count } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("product_id", input.productId)
      .in("order_id", orderIds);
    verified = (count ?? 0) > 0;
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      product_id: input.productId,
      user_id: user.id,
      rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      verified_purchase: verified,
    },
    { onConflict: "product_id,user_id" },
  );

  if (error) throw error;
  if (input.productSlug) {
    revalidatePath(`/products/${input.productSlug}`);
  }
  revalidatePath("/products");
}
