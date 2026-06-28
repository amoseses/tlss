export function generatedProfilePhotoUrl(seed?: string | null) {
  const safeSeed = encodeURIComponent((seed || "givit-guest").trim().toLowerCase());
  return `https://api.dicebear.com/9.x/initials/svg?seed=${safeSeed}&backgroundColor=f6a6c9,ff6f61,f97393,ffd6e7&fontWeight=700&radius=50`;
}
