/// <reference path="../../mjs-modules.d.ts" />
// Google redirects the user's browser here after they approve (or decline)
// access -- a real navigation, not a fetch, so state (not a header) is how
// we recover which user this belongs to.
import { verifyState } from "../../_lib/auth.mjs";
import { exchangeCodeForTokens } from "../../_lib/google-calendar.mjs";
import { saveConnection } from "../../_lib/calendar-connections.mjs";

function redirect(res: any, path: string) {
  res.writeHead(302, { Location: `https://givit.site${path}` });
  res.end();
}

export default async function handler(req: any, res: any) {
  const { code, state, error } = req.query ?? {};

  if (error) {
    redirect(res, "/people?calendar=denied");
    return;
  }

  const payload = typeof state === "string" ? verifyState(state) : null;
  if (!payload?.userId || typeof code !== "string") {
    redirect(res, "/people?calendar=error");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the user previously connected and this consent screen
      // didn't force a fresh one -- buildAuthUrl always sets prompt=consent
      // specifically to avoid this, but fail loudly rather than silently
      // keeping a stale/missing connection.
      redirect(res, "/people?calendar=error");
      return;
    }
    await saveConnection(payload.userId, tokens.refresh_token);
    redirect(res, "/people?calendar=connected");
  } catch (err: any) {
    console.error("google-calendar callback failed:", err?.message);
    redirect(res, "/people?calendar=error");
  }
}
