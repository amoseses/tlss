import { publicStorageUrl } from "@/lib/storage";
import type { ProductImage } from "@/types/database";

/**
 * Curated Unsplash photos — artisan/market style, not generic stock corporate
 * shots. Spans the same categories as marketplace.ts's IMAGE_POOLS (and
 * reuses those exact, already-verified-working photo ids) so a product that
 * falls back here still lands on something visually in the right neighborhood
 * instead of a totally unrelated image. Kept large (40+) so the deterministic
 * hash in productPhotoFallback() spreads products across many distinct
 * photos instead of a handful of them repeating across the whole catalog.
 */
const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&q=80",
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=640&q=80",
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=640&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80",
  "https://images.unsplash.com/photo-1511690656952-343388141cc5?w=640&q=80",
  "https://images.unsplash.com/photo-1464960320600-064064e322ee?w=640&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
  // tech
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=640&q=80",
  "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=640&q=80",
  "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=640&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=640&q=80",
  // gaming
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80",
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=640&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=640&q=80",
  "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=640&q=80",
  // home
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=640&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=640&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=640&q=80",
  "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=640&q=80",
  "https://images.unsplash.com/photo-1522444195799-478538b28823?w=640&q=80",
  // kitchen
  "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=640&q=80",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=640&q=80",
  "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=640&q=80",
  // writing
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=640&q=80",
  "https://images.unsplash.com/photo-1517842645767-c639042777db?w=640&q=80",
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=640&q=80",
  // beauty
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=640&q=80",
  "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=640&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=640&q=80",
  // outdoor
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=640&q=80",
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=640&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=640&q=80",
  // fitness
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=640&q=80",
  // pets
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=640&q=80",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=640&q=80",
  // art
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=640&q=80",
  "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=640&q=80",
  // food / experiences
  "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=640&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=640&q=80",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=640&q=80",
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
