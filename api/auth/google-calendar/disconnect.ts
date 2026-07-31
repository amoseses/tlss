/// <reference path="../../mjs-modules.d.ts" />
import { getUserFromRequest } from "../../_lib/auth.mjs";
import { deleteConnection } from "../../_lib/calendar-connections.mjs";

export default async function handler(req: any, res: any) {
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
