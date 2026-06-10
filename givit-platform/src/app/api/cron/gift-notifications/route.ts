import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: due, error } = await supabase
    .from("gift_notifications")
    .select("id, user_id, recipient_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((due ?? []).map((row) => row.user_id as string))];
  const recipientIds = [...new Set((due ?? []).map((row) => row.recipient_id as string).filter(Boolean))];
  const [{ data: profiles }, { data: recipients }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, gift_automation_enabled").in("id", userIds) : Promise.resolve({ data: [] }),
    recipientIds.length ? supabase.from("gift_recipients").select("id, automation_enabled").in("id", recipientIds) : Promise.resolve({ data: [] }),
  ]);

  const enabledUsers = new Set((profiles ?? []).filter((row) => row.gift_automation_enabled).map((row) => row.id));
  const enabledRecipients = new Set((recipients ?? []).filter((row) => row.automation_enabled).map((row) => row.id));
  const ids = (due ?? [])
    .filter((row) => enabledUsers.has(row.user_id) && (!row.recipient_id || enabledRecipients.has(row.recipient_id)))
    .map((row) => row.id);

  if (ids.length > 0) {
    await supabase.from("gift_notifications").update({ status: "sent", sent_at: new Date().toISOString() }).in("id", ids);
  }

  return NextResponse.json({ processed: ids.length, notificationIds: ids });
}
