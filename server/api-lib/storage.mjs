import { restBase } from "./supabase-rest.mjs";

// Bucket must be created (and marked Public) in the Supabase dashboard
// first -- see .env.example for the one-time setup steps. Configurable via
// env so a differently-named bucket doesn't need a code change, but
// "uploads" is what the setup instructions tell people to create.
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "uploads";

// Supabase Storage instead of S3: no CORS surface (still server-to-server,
// same as the old direct S3 PutObject call), and bucket creation + the
// public-read setting happen in the same Supabase dashboard this project
// already has full admin access to -- unlike AWS, where IAM permissions
// for uploads kept needing an AWS account owner who wasn't always
// reachable. Uses the Storage REST API directly (not the supabase-js
// client) since this only needs one call and it keeps this file
// dependency-free, matching supabase-rest.mjs's existing plain-fetch
// pattern for the same service-role key.
export async function uploadFileDirect(key, contentType, buffer) {
  const { url, key: serviceKey } = restBase();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${key}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Named explicitly (bucket not found vs. anything else) since this is
    // the exact failure mode the AWS version kept hitting, and there's no
    // way to check Vercel's function logs directly to diagnose blind.
    if (res.status === 404) {
      throw new Error(`Bucket "${BUCKET}" doesn't exist yet in Supabase Storage, or isn't public. Create it in the Supabase dashboard's Storage tab.`);
    }
    throw new Error(`Supabase storage upload failed (${res.status}): ${text || res.statusText}`);
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${key}`;
}
