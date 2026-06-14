import { normalizeSupabaseUrl } from "@/lib/supabase/env";

export function publicStorageUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (!raw) return "";
  const base = normalizeSupabaseUrl(raw);
  const clean = path.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/product-images/${clean}`;
}
