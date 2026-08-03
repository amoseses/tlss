/// <reference path="../../mjs-modules.d.ts" />
// Single catch-all style handler for Google Calendar auth routes. Keeping
// start/callback/disconnect in one Vercel Function prevents Hobby-plan
// deployments from exceeding the 12 Serverless Function limit while
// preserving the existing public API paths.
import { getUserFromRequest, signState, verifyState } from "../../_lib/auth.mjs";
import { deleteConnection, saveConnection } from "../../_lib/calendar-connections.mjs";
import { buildAuthUrl, exchangeCodeForTokens } from "../../_lib/google-calendar.mjs";

function redirect(res: any, path: string) {
  res.writeHead(302, { Location: `https://givit.site${path}` });
  res.end();
}

async function start(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const state = signState({ userId: user.id });
    res.status(200).json({ url: buildAuthUrl(state) });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't start Google Calendar connect." });
  }
}

async function callback(req: any, res: any) {
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

async function disconnect(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
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
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;

  if (action === "start") return start(req, res);
  if (action === "callback") return callback(req, res);
  if (action === "disconnect") return disconnect(req, res);

  res.status(404).json({ error: "Google Calendar route not found." });
}
