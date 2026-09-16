// Uploads a file by proxying it through GIVIT's own server (which then
// puts it in S3), never a direct-from-browser PUT to a presigned S3 URL.
// The direct-to-S3 approach kept failing with a browser-level "Failed to
// fetch" that traced back to the bucket's CORS configuration -- fixable,
// but only by whoever has the right AWS/IAM access, which became a
// recurring blocker. Routing the actual upload through our own API
// sidesteps CORS entirely: the browser only ever talks to our own origin,
// and the server-to-server call to S3 has no CORS restriction to begin
// with.
//
// Resizing client-side first (not just for this reason, but because it's
// simply correct for a profile photo or board cover) also keeps the
// request comfortably under Vercel's ~4.5MB serverless function body
// limit -- a raw phone photo can be 10-20MB, which a JSON+base64 proxy
// (roughly +33% size) would otherwise blow straight through.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function resizeImage(file: File): Promise<{ blob: Blob; contentType: string }> {
  // Only real bitmap images benefit from/support canvas resizing; anything
  // else (a GIF, an SVG) is passed through untouched.
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    return { blob: file, contentType: file.type || "application/octet-stream" };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, contentType: file.type || "application/octet-stream" };
  ctx.drawImage(bitmap, 0, 0, width, height);

  const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, contentType, JPEG_QUALITY));
  return blob ? { blob, contentType } : { blob: file, contentType: file.type || "application/octet-stream" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix -- the server only
      // wants the raw base64 payload.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function uploadFileToS3(file: File, prefix = "uploads") {
  const { blob, contentType } = await resizeImage(file);
  const dataBase64 = await blobToBase64(blob);

  const res = await fetch("/api/upload/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType, prefix, dataBase64 }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not upload the file.");
  }

  return (await res.json()) as { key: string; url: string };
}
