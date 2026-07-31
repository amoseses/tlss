// Server-side helpers for verifying who's actually calling an API route.
// Never trust a client-supplied user id directly -- the bearer token is
// handed to Supabase's own /auth/v1/user endpoint, which is the only thing
// that can say "this token really belongs to this user."
import crypto from "node:crypto";

export async function getUserFromRequest(req) {
  const authHeader = req.headers?.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return null;

  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

// Signs a short-lived payload for OAuth's `state` param — the only thing
// standing between "Google redirected back to us" and "we know which user
// this connection belongs to," since Vercel functions don't see the
// browser's Supabase session on that redirect.
function stateSecret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  return key;
}

export function signState(payload, ttlMs = 10 * 60 * 1000) {
  const body = JSON.stringify({ ...payload, exp: Date.now() + ttlMs });
  const b64 = Buffer.from(body, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", stateSecret()).update(b64).digest("base64url");
  // Constant-time compare -- a plain === here would leak timing info about
  // how many leading bytes of the signature matched.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
