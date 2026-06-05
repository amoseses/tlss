import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminSellerOrders } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

import { AdminOrderStatusSelect } from "./admin-order-status";

export default async function AdminOrdersPage() {
  const sellerOrders = await getAdminSellerOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Fulfillment for your seller shipments. Buyers pay at checkout; payouts go to your Stripe
          account.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Your total</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellerOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              sellerOrders.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.order_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMoney(row.merchandise_cents + row.shipping_cents + row.tax_cents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.shipping_carrier} {row.shipping_service}
                  </TableCell>
                  <TableCell>
                    <AdminOrderStatusSelect sellerOrder={row} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/orders/${row.order_id}`} className="text-primary text-sm hover:underline">
                      View
                    </Link>
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
