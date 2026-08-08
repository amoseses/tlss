import { restFetch } from "./supabase-rest.mjs";

export async function saveConnection(userId, refreshToken) {
  // upsert on (user_id, provider) -- Prefer: resolution=merge-duplicates
  // requires the unique constraint that's part of the calendar_connections
  // migration.
  await restFetch("calendar_connections?on_conflict=user_id,provider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, provider: "google", refresh_token: refreshToken, connected_at: new Date().toISOString() }),
  });
}

export async function getConnection(userId) {
  const rows = await restFetch(`calendar_connections?user_id=eq.${userId}&provider=eq.google&select=*`);
  return rows?.[0] ?? null;
}

export async function deleteConnection(userId) {
  await restFetch(`calendar_connections?user_id=eq.${userId}&provider=eq.google`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function markSynced(userId) {
  await restFetch(`calendar_connections?user_id=eq.${userId}&provider=eq.google`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
  });
}
