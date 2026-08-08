/// <reference path="../mjs-modules.d.ts" />
import { getUserFromRequest } from "../../server/api-lib/auth.mjs";
import { getConnection } from "../../server/api-lib/calendar-connections.mjs";

export default async function handler(req: any, res: any) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const connection = await getConnection(user.id);
    res.status(200).json({
      connected: Boolean(connection),
      connectedAt: connection?.connected_at ?? null,
      lastSyncedAt: connection?.last_synced_at ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't check calendar status." });
  }
}
