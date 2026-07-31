/// <reference path="../../mjs-modules.d.ts" />
// Kicks off the Google Calendar connect flow. Called via fetch (not a plain
// link) so the Supabase access token can travel in an Authorization header
// instead of a URL, which would otherwise leak into referrer headers/logs.
import { getUserFromRequest, signState } from "../../_lib/auth.mjs";
import { buildAuthUrl } from "../../_lib/google-calendar.mjs";

export default async function handler(req: any, res: any) {
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
