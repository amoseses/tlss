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


type SheetProductRow = {
  product_link?: string;
  image_link?: string;
  name?: string;
  description?: string;
  sku?: string;
  price?: string;
  category?: string;
  gift_tags?: string;
  occasion_tags?: string;
  relationship_tags?: string;
};

type ScrapedProductDetails = {
  title?: string;
  description?: string;
  image?: string;
  priceCents?: number;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function rowsFromCsv(text: string): SheetProductRow[] {
  const rows = parseCsv(text);
  const headers = rows[0]?.map(normalizeHeader) ?? [];
  if (headers.length === 0) return [];

  return rows.slice(1).map((row) => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header] = row[index]?.trim() ?? "";
    });
    return {
      product_link: entry.product_link || entry.product_url || entry.url || entry.link,
      image_link: entry.image_link || entry.image_url || entry.image || entry.photo_url,
      name: entry.name || entry.title || entry.product_name,
      description: entry.description || entry.summary,
      sku: entry.sku,
      price: entry.price || entry.price_dollars || entry.amount,
      category: entry.category || entry.category_slug,
      gift_tags: entry.gift_tags || entry.tags || entry.interests,
      occasion_tags: entry.occasion_tags || entry.occasions,
      relationship_tags: entry.relationship_tags || entry.recipients || entry.relationships,
    };
  });
}

function googleSheetCsvUrl(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  if (raw.includes("/export?") || raw.includes("output=csv")) return raw;
  const match = raw.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) return raw;
  const gid = raw.match(/[?&]gid=([^&]+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
}

function splitTags(value?: string) {
  return (value ?? "")
    .split(/[|,]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function parsePriceCents(value?: string) {
  const cleaned = (value ?? "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const dollars = Number.parseFloat(cleaned);
  if (Number.isNaN(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function absoluteUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return "";
  }
}

function firstMeta(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
  }
  return undefined;
}

async function scrapeProductDetails(productUrl: string): Promise<ScrapedProductDetails> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        "user-agent": "Givit product importer (+https://givit.local)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return {};
    const html = (await response.text()).slice(0, 250000);
    const title = firstMeta(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);
    const description = firstMeta(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]);
    const rawImage = firstMeta(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]);
    const rawPrice = firstMeta(html, [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /"price"\s*:\s*"?([0-9]+(?:\.[0-9]{1,2})?)"?/i,
    ]);

    return {
      title,
      description,
      image: rawImage ? absoluteUrl(rawImage, productUrl) : undefined,
      priceCents: parsePriceCents(rawPrice) ?? undefined,
    };
  } catch {
    return {};
  }
}

export async function importProductsFromSheetAction(raw: { sheet_url?: string; csv_text?: string; default_published?: boolean }) {
  const { supabase, user } = await requireAdmin();
  let csv = raw.csv_text?.trim() ?? "";

  if (!csv && raw.sheet_url?.trim()) {
    const response = await fetch(googleSheetCsvUrl(raw.sheet_url), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Could not download the Google Sheet as CSV. Make sure the sheet is shared or published.");
    csv = await response.text();
  }

  if (!csv) throw new Error("Paste CSV rows or provide a Google Sheet URL.");
  const rows = rowsFromCsv(csv).filter((row) => row.product_link || row.name);
  if (rows.length === 0) throw new Error("No product rows found. Include headers like product_link, image_link, name, price, and category.");

  const { data: categories } = await supabase.from("categories").select("id, slug, name");
  const categoryByKey = new Map<string, string>();
  for (const category of categories ?? []) {
    categoryByKey.set(String(category.slug).toLowerCase(), category.id as string);
    categoryByKey.set(String(category.name).toLowerCase(), category.id as string);
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      const productLink = row.product_link?.trim() ?? "";
      if (productLink) {
        const { data: existing } = await supabase.from("products").select("id").eq("affiliate_url", productLink).maybeSingle();
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      const scraped = productLink ? await scrapeProductDetails(productLink) : {};
      const name = (row.name || scraped.title || `Imported product ${index + 1}`).trim().slice(0, 180);
      const priceCents = parsePriceCents(row.price) ?? scraped.priceCents ?? 2500;
      const image = row.image_link?.trim() || scraped.image;
      const categoryKey = row.category?.trim().toLowerCase() ?? "";
      const categoryId = categoryByKey.get(categoryKey) ?? null;
      const giftTags = splitTags(row.gift_tags || row.category).length > 0 ? splitTags(row.gift_tags || row.category) : ["giftable"];
      const occasionTags = splitTags(row.occasion_tags);
      const relationshipTags = splitTags(row.relationship_tags);
      const slug = await uniqueProductSlug(supabase, slugify(name));
      const sku = row.sku?.trim() || `IMP-${Date.now().toString(36).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name,
          slug,
          description: (row.description || scraped.description || "Imported from a curated product sheet. Admin can refine details after review.").trim(),
          sku,
          price_cents: priceCents,
          weight_oz: Math.max(4, Math.round(priceCents / 650)),
          min_order_qty: 1,
          stock: 999,
          is_published: raw.default_published ?? false,
          category_id: categoryId,
          seller_id: user.id,
          affiliate_url: productLink || null,
          gift_tags: giftTags,
          occasion_tags: occasionTags,
          relationship_tags: relationshipTags,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (image && product?.id) {
        const { error: imageError } = await supabase.from("product_images").insert({
          product_id: product.id,
          storage_path: image,
          sort_order: 0,
        });
        if (imageError) errors.push(`Row ${index + 2}: product created but image failed (${imageError.message})`);
      }
      created += 1;
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  revalidatePath("/products");
  revalidatePath("/admin/products");
  return { created, skipped, errors: errors.slice(0, 10) };
}
