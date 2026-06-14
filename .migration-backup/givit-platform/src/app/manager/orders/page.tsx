import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { getManagerOrders } from "@/lib/data/manager";
import type { Order } from "@/types/database";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  fulfilled: "outline",
  cancelled: "destructive",
};

export default async function ManagerOrdersPage() {
  const rows = await getManagerOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Recent platform orders across all buyers and sellers.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows as Order[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Order[]).map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/orders/${o.id}`} className="givit-link font-mono text-xs">
                      {o.id.slice(0, 8)}…
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{o.user_id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatMoney(o.subtotal_cents)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status] ?? "secondary"} className="rounded-lg">
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
