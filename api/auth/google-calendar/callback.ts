/// <reference path="../../mjs-modules.d.ts" />
// All three Google Calendar auth actions (start / callback / disconnect)
// live in one Vercel Function to stay under the Hobby-plan 12 Function
// limit. This can't use a [action].ts bracket route the way it briefly
// did -- Vercel's build for this project doesn't serve bracket dynamic
// segments under api/ (requests to them fall through to the SPA rewrite
// and 405/index.html instead of reaching the function, confirmed live).
// So this stays on the one path Google actually calls back to --
// registered as the OAuth client's redirect_uri in Google Cloud Console,
// and NOT something that can move without updating that registration --
// and differentiates the other two actions by HTTP method instead:
// GET = Google's OAuth redirect, POST = start, DELETE = disconnect.
import { getUserFromRequest, signState, verifyState } from "../../../server/api-lib/auth.mjs";
import { deleteConnection, saveConnection } from "../../../server/api-lib/calendar-connections.mjs";
import { buildAuthUrl, exchangeCodeForTokens } from "../../../server/api-lib/google-calendar.mjs";

function redirect(res: any, path: string) {
  const baseUrl = process.env.APP_BASE_URL || (process.env.NODE_ENV === "production" ? "https://givit.site" : "http://localhost:3000");
  res.writeHead(302, { Location: `${baseUrl}${path}` });
  res.end();
}

async function start(req: any, res: any) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const redirectPath = req.body?.redirectPath || req.query?.redirectPath || "/calendar";
    const state = signState({ userId: user.id, redirectPath });
    res.status(200).json({ url: buildAuthUrl(state, req) });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't start Google Calendar connect." });
  }
}

async function callback(req: any, res: any) {
  const { code, state, error } = req.query ?? {};
  const payload = typeof state === "string" ? verifyState(state) : null;
  const targetPath = payload?.redirectPath || "/calendar";

  if (error) {
    redirect(res, `${targetPath}?calendar=denied`);
    return;
  }

  if (!payload?.userId || typeof code !== "string") {
    redirect(res, `${targetPath}?calendar=error`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, req);
    const refreshToken = tokens.refresh_token || tokens.access_token;
    if (!refreshToken) {
      redirect(res, `${targetPath}?calendar=error`);
      return;
    }
    await saveConnection(payload.userId, refreshToken);
    redirect(res, `${targetPath}?calendar=connected`);
  } catch (err: any) {
    console.error("google-calendar callback failed:", err?.message);
    redirect(res, `${targetPath}?calendar=error`);
  }
}

async function disconnect(req: any, res: any) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    await deleteConnection(user.id);
    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't disconnect." });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") return callback(req, res);
  if (req.method === "POST") return start(req, res);
  if (req.method === "DELETE") return disconnect(req, res);
  res.status(405).json({ error: "Method not allowed" });
}
