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

export function isRemoteImageUrl(url: string) {
  return /^https?:\/\//.test(url);
}

function looksAiGenerated(url: string) {
  return /(?:oaidalleapiprodscus|dall-e|midjourney|stable-diffusion|replicate|fal\.ai|ai-generated|generated)/i.test(url);
}

function normalizePhotoUrl(url: string) {
  if (/images\.unsplash\.com/.test(url) && !/[?&](w|q)=/.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}auto=format&fit=crop&w=640&q=80`;
  }
  return url;
}

/** Same image source as product cards: uploaded/merchant photo, skipping known AI-generated URLs, with deterministic real-photo fallback. */
export function resolveProductImageSrc(productId: string, images: ProductImage[]) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const firstUsable = sorted.find((image) => image.storage_path && !looksAiGenerated(image.storage_path));
  if (!firstUsable) return productPhotoFallback(productId);
  if (/^https?:\/\//.test(firstUsable.storage_path)) return normalizePhotoUrl(firstUsable.storage_path);
  return publicStorageUrl(firstUsable.storage_path);
}

export function isLikelyAiGeneratedImage(url: string) {
  return looksAiGenerated(url);
}
