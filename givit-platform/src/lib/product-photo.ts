import { publicStorageUrl } from "@/lib/storage";
import type { ProductImage } from "@/types/database";

/** Curated Unsplash photos — artisan/market style, not generic stock corporate shots. */
const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&q=80",
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=640&q=80",
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=640&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80",
  "https://images.unsplash.com/photo-1511690656952-343388141cc5?w=640&q=80",
  "https://images.unsplash.com/photo-1464960320600-064064e322ee?w=640&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9a?w=640&q=80",
];

export function productPhotoFallback(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % FALLBACK_PHOTOS.length;
  }
  return FALLBACK_PHOTOS[hash]!;
}

export function isUnsplashUrl(url: string) {
  return url.includes("images.unsplash.com");
}

/** Same image source as product cards: uploaded photo or deterministic Unsplash fallback. */
export function resolveProductImageSrc(productId: string, images: ProductImage[]) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const first = sorted[0];
  if (!first) return productPhotoFallback(productId);
  if (/^https?:\/\//.test(first.storage_path)) return first.storage_path;
  return publicStorageUrl(first.storage_path);
}
