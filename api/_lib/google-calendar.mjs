// Thin wrapper around Google's OAuth + Calendar API endpoints (plain fetch,
// no SDK -- matches the rest of api/_lib). Requires GOOGLE_CALENDAR_CLIENT_ID
// and GOOGLE_CALENDAR_CLIENT_SECRET, from an OAuth client registered in
// Google Cloud Console with this exact redirect URI.
const REDIRECT_URI = "https://givit.site/api/auth/google-calendar/callback";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

function credentials() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET are not configured on the server.");
  }
  return { clientId, clientSecret };
}

export function buildAuthUrl(state) {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Forces Google to hand back a refresh token even if this user already
    // granted access before -- without it, a reconnect after revoking
    // access silently returns no refresh_token at all.
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret } = credentials();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = credentials();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function fetchCalendarList(accessToken) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google calendarList failed (${res.status})`);
  const data = await res.json();
  return data.items ?? [];
}

// Recurring events (birthdays, anniversaries) come back as one instance per
// year when singleEvents=true, which is what lets a plain date-range query
// find "the next occurrence" without us having to parse RRULEs ourselves.
export async function fetchEvents(accessToken, calendarId, timeMinIso, timeMaxIso) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    maxResults: "250",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google events.list failed (${res.status}) for ${calendarId}`);
  const data = await res.json();
  return data.items ?? [];
}
