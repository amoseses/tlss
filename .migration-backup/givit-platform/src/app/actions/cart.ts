"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { getOrCreateCartId } from "./cart-helpers";

export async function addToCartAction(productId: string, quantity: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, min_order_qty, stock, is_published")
    .eq("id", productId)
    .single();
  if (pErr || !product) throw new Error("Product not found");
  if (!product.is_published) throw new Error("Product unavailable");

  const min = Math.max(1, product.min_order_qty as number);
  const qty = Math.max(min, quantity);
  if (qty > (product.stock as number)) throw new Error("Not enough stock");

  const cartId = await getOrCreateCartId(supabase, user.id);

  const { data: existingLine } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingLine) {
    const nextQty = (existingLine.quantity as number) + qty;
    if (nextQty > (product.stock as number)) throw new Error("Not enough stock");
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existingLine.id as string);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartId,
      product_id: productId,
      quantity: qty,
    });
    if (error) throw error;
  }

  revalidatePath("/cart");
  revalidatePath("/products");
}

export async function updateCartLineAction(cartItemId: string, quantity: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const { data: line, error: lErr } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity, carts!inner(user_id)")
    .eq("id", cartItemId)
    .single();
  if (lErr || !line) throw new Error("Line not found");

  type CartLine = typeof line & { carts: { user_id: string } };
  const full = line as CartLine;
  if (full.carts.user_id !== user.id) throw new Error("Unauthorized");

  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
    if (error) throw error;
    revalidatePath("/cart");
    return;
  }

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("min_order_qty, stock")
    .eq("id", full.product_id as string)
    .single();
  if (pErr || !product) throw new Error("Product not found");

  const min = Math.max(1, product.min_order_qty as number);
  if (quantity < min) throw new Error(`Minimum order quantity is ${min}`);
  if (quantity > (product.stock as number)) throw new Error("Not enough stock");

  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId);
  if (error) throw error;
  revalidatePath("/cart");
}

export async function removeCartLineAction(cartItemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const { data: line } = await supabase
    .from("cart_items")
    .select("id, carts!inner(user_id)")
    .eq("id", cartItemId)
    .single();
  if (!line) throw new Error("Not found");
  type Row = typeof line & { carts: { user_id: string } };
  if ((line as Row).carts.user_id !== user.id) throw new Error("Unauthorized");

  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  if (error) throw error;
  revalidatePath("/cart");
}
