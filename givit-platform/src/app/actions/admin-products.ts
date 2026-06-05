"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
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
  if (role !== "admin") throw new Error("Only admins can edit marketplace products.");
  return { supabase, user };
}

async function uniqueProductSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string) {
  const slug = base || "product";
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const { data } = await supabase.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
  }
}

export async function createProductAction(raw: {
  name: string;
  description: string;
  sku: string;
  price_dollars: string;
  weight_oz: string;
  min_order_qty: number;
  stock: number;
  is_published: boolean;
  category_id: string | null;
  gift_tags?: string[];
  occasion_tags?: string[];
  relationship_tags?: string[];
}) {
  const { supabase, user } = await requireAdmin();
  const name = raw.name.trim();
  if (!name) throw new Error("Name is required");
  const dollars = Number.parseFloat(raw.price_dollars);
  if (Number.isNaN(dollars) || dollars < 0) throw new Error("Invalid price");
  const weightOz = Number.parseFloat(raw.weight_oz);
  if (Number.isNaN(weightOz) || weightOz <= 0) {
    throw new Error("Weight per unit (oz) is required and must be greater than zero.");
  }
  const price_cents = Math.round(dollars * 100);
  const baseSlug = slugify(name);
  const slug = await uniqueProductSlug(supabase, baseSlug);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      description: raw.description.trim() || null,
      sku: raw.sku.trim(),
      price_cents,
      weight_oz: weightOz,
      min_order_qty: Math.max(1, raw.min_order_qty),
      stock: Math.max(0, raw.stock),
      is_published: raw.is_published,
      category_id: raw.category_id && raw.category_id !== "__none__" ? raw.category_id : null,
      seller_id: user.id,
      gift_tags: raw.gift_tags ?? [],
      occasion_tags: raw.occasion_tags ?? [],
      relationship_tags: raw.relationship_tags ?? [],
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/products");
  revalidatePath("/admin/products");
  return data.id as string;
}

export async function updateProductAction(
  id: string,
  raw: {
    name: string;
    description: string;
    sku: string;
    price_dollars: string;
    weight_oz: string;
    min_order_qty: number;
    stock: number;
    is_published: boolean;
    category_id: string | null;
    gift_tags?: string[];
    occasion_tags?: string[];
    relationship_tags?: string[];
  },
) {
  const { supabase } = await requireAdmin();
  const name = raw.name.trim();
  if (!name) throw new Error("Name is required");
  const dollars = Number.parseFloat(raw.price_dollars);
  if (Number.isNaN(dollars) || dollars < 0) throw new Error("Invalid price");
  const weightOz = Number.parseFloat(raw.weight_oz);
  if (Number.isNaN(weightOz) || weightOz <= 0) {
    throw new Error("Weight per unit (oz) is required and must be greater than zero.");
  }
  const price_cents = Math.round(dollars * 100);
  const { data: existing } = await supabase.from("products").select("slug, name").eq("id", id).single();
  if (!existing) throw new Error("Not found");
  let slug = existing.slug as string;
  if ((existing.name as string).trim() !== name) {
    const baseSlug = slugify(name);
    slug = await uniqueProductSlug(supabase, baseSlug);
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      slug,
      description: raw.description.trim() || null,
      sku: raw.sku.trim(),
      price_cents,
      weight_oz: weightOz,
      min_order_qty: Math.max(1, raw.min_order_qty),
      stock: Math.max(0, raw.stock),
      is_published: raw.is_published,
      category_id: raw.category_id && raw.category_id !== "__none__" ? raw.category_id : null,
      gift_tags: raw.gift_tags ?? [],
      occasion_tags: raw.occasion_tags ?? [],
      relationship_tags: raw.relationship_tags ?? [],
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/products");
  revalidatePath("/admin/products");
  revalidatePath(`/products/${slug}`);
}

export async function deleteProductAction(id: string) {
  const { supabase } = await requireAdmin();
  const { data: imgs } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);
  const paths = (imgs ?? []).map((r) => r.storage_path as string).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/products");
  revalidatePath("/admin/products");
}

export async function addProductImageRecordAction(
  productId: string,
  storagePath: string,
  sortOrder: number,
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    sort_order: sortOrder,
  });
  if (error) throw error;
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function deleteProductImageAction(imageId: string) {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();
  if (row?.storage_path) {
    await supabase.storage.from("product-images").remove([row.storage_path as string]);
  }
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
