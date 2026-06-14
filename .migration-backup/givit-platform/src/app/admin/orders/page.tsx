import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminGiftApprovals, getAdminSellerOrders } from "@/lib/data/admin";
import { formatMoney } from "@/lib/format";

import { AdminOrderStatusSelect } from "./admin-order-status";
import { GiftFulfillmentStatusSelect } from "./gift-fulfillment-status";

export default async function AdminOrdersPage() {
  const [sellerOrders, giftApprovals] = await Promise.all([getAdminSellerOrders(), getAdminGiftApprovals()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Fulfillment for your seller shipments. Buyers pay at checkout; payouts go to your Stripe
          account.
        </p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">GivIt Concierge — Paid Pending Fulfillment</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient / address</TableHead>
              <TableHead>Selected items and flowers</TableHead>
              <TableHead>Card text</TableHead>
              <TableHead>Status tracker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giftApprovals.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground py-8 text-center text-sm">No concierge orders are waiting on fulfillment.</TableCell></TableRow>
            ) : giftApprovals.map((approval) => (
              <TableRow key={approval.id} className="align-top">
                <TableCell className="max-w-xs text-sm">
                  <p className="font-medium">{approval.recipient?.ship_to_name ?? approval.recipient?.name}</p>
                  <p className="text-muted-foreground">{[approval.recipient?.ship_to_line1, approval.recipient?.ship_to_line2, approval.recipient?.ship_to_city, approval.recipient?.ship_to_state, approval.recipient?.ship_to_zip, approval.recipient?.ship_to_country].filter(Boolean).join(", ")}</p>
                  <p className="mt-2 font-mono text-xs">{approval.id.slice(0, 8)}… · {formatMoney(approval.total_cents)}</p>
                </TableCell>
                <TableCell className="max-w-sm space-y-2 text-sm">
                  {approval.gift_approval_items.map((item) => (
                    <div key={item.id}>
                      <p className="font-medium">{item.item_type}: {item.title}</p>
                      {item.external_url ? <a href={item.external_url} target="_blank" className="text-primary hover:underline">Source URL</a> : <p className="text-muted-foreground">Admin/provider sourced</p>}
                    </div>
                  ))}
                </TableCell>
                <TableCell className="max-w-sm text-sm">{approval.card_message}</TableCell>
                <TableCell><GiftFulfillmentStatusSelect approvalId={approval.id} status={approval.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
