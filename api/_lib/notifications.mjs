// Server-side Supabase access for the notification-dispatch cron. Uses plain
// fetch against Supabase's REST API (PostgREST) with the service-role key,
// rather than pulling in @supabase/supabase-js, so this stays consistent
// with the other api/_lib modules (photo.mjs, metadata.mjs) and avoids a
// dependency that has to be traced/bundled by Vercel's function builder.

function restBase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured on the server.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function restFetch(path, init = {}) {
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

export async function fetchDueNotifications(limit = 200) {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams({
    select: "*",
    status: "eq.scheduled",
    scheduled_for: `lte.${nowIso}`,
    order: "scheduled_for.asc",
    limit: String(limit),
  });
  return restFetch(`gift_notifications?${params.toString()}`);
}

export async function fetchProfilesByIds(userIds) {
  if (userIds.length === 0) return [];
  const params = new URLSearchParams({
    select: "id,email,full_name,phone",
    id: `in.(${userIds.join(",")})`,
  });
  return restFetch(`profiles?${params.toString()}`);
}

export async function fetchPushSubscriptions(userId) {
  const params = new URLSearchParams({ select: "*", user_id: `eq.${userId}` });
  return restFetch(`push_subscriptions?${params.toString()}`);
}

export async function markNotificationStatus(id, status) {
  const body = status === "sent" ? { status, sent_at: new Date().toISOString() } : { status };
  await restFetch(`gift_notifications?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

// PostgREST can't do a partial JSONB merge in one PATCH, so this reads the
// row's current metadata and writes it back with the new key added rather
// than overwriting whatever else (recipientName, occasion, ...) was already
// stored there.
async function mergeNotificationMetadata(id, patch) {
  const rows = await restFetch(`gift_notifications?id=eq.${id}&select=metadata`);
  const existing = rows?.[0]?.metadata ?? {};
  await restFetch(`gift_notifications?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ metadata: { ...existing, ...patch } }),
  });
}

// Called from the tracking-pixel endpoint. Idempotent by construction
// (fetch-then-write), and a pixel can legitimately fire more than once
// (email client prefetching, the recipient reopening the email) without
// that being a problem here.
export async function markNotificationOpened(id) {
  await mergeNotificationMetadata(id, { opened_at: new Date().toISOString() });
}

export async function markFollowupSent(id) {
  await mergeNotificationMetadata(id, { followup_sent_at: new Date().toISOString() });
}

// Reminder emails that were sent but never opened, and haven't already
// gotten a follow-up nudge — the actual "send it again if they ignored it"
// signal the dispatch-followups cron acts on.
export async function fetchUnopenedEmailNotifications(olderThanHours, limit = 200) {
  const cutoff = new Date(Date.now() - olderThanHours * 3600000).toISOString();
  const params = new URLSearchParams({
    select: "*",
    status: "eq.sent",
    channel: "eq.email",
    sent_at: `lte.${cutoff}`,
    "metadata->>opened_at": "is.null",
    "metadata->>followup_sent_at": "is.null",
    order: "sent_at.asc",
    limit: String(limit),
  });
  return restFetch(`gift_notifications?${params.toString()}`);
}
