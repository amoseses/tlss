import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { Order } from "@/types/database";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  fulfilled: "outline",
  cancelled: "destructive",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (orders ?? []) as Order[];

  return (
    <PageShell>
      <PageHeader
        title="Orders"
        description="Your paid wholesale orders with shipping and tax breakdowns."
      />
      <ul className="mx-auto max-w-2xl space-y-3">
        {list.length === 0 ? (
          <li className="text-muted-foreground rounded-lg border p-8 text-center text-sm">
            No orders yet.{" "}
            <Link href="/products" className="text-primary underline">
              Start shopping
            </Link>
          </li>
        ) : (
          list.map((o) => (
            <li key={o.id} className="rounded-lg border">
              <Link href={`/orders/${o.id}`} className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium tabular-nums">
                    Order <span className="font-mono text-sm">{o.id.slice(0, 8)}…</span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(o.total_cents ?? o.subtotal_cents)}
                  </span>
                  <Badge variant={statusVariant[o.status] ?? "secondary"}>{o.status}</Badge>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </PageShell>
  );
}
