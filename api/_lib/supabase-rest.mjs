// Shared plain-fetch Supabase REST helper (service-role key), same pattern
// as api/_lib/notifications.mjs uses internally -- pulled out here so new
// _lib modules don't each redefine it.
export function restBase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured on the server.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

export async function restFetch(path, init = {}) {
  const { url, key } = restBase();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST ${path} failed (${res.status}): ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}
