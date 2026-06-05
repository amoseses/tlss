import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import type { Order, OrderItem } from "@/types/database";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ thanks?: string }> };

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).single();
  if (error || !order) notFound();

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);

  const o = order as Order;
  const lines = (items ?? []) as OrderItem[];
  const orderTotal = o.total_cents ?? o.subtotal_cents;

  return (
    <PageShell>
      {sp.thanks ? (
        <div className="border-primary/30 bg-primary/5 givit-panel mb-8 px-4 py-3 text-center text-sm">
          Thank you — payment received. Order reference{" "}
          <span className="font-mono font-medium">{o.id}</span>.
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order details</h1>
          <p className="text-muted-foreground font-mono text-sm">{o.id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{o.status}</Badge>
          {o.payment_status ? <Badge variant="outline">{o.payment_status}</Badge> : null}
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        Placed {new Date(o.created_at).toLocaleString()}
      </p>

      <Separator className="my-8" />

      <h2 className="font-medium">Line items</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {lines.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span>
              {item.product_name}{" "}
              <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            <span className="tabular-nums">{formatMoney(item.unit_price_cents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Merchandise</span>
          <span className="tabular-nums">{formatMoney(o.merchandise_cents ?? o.subtotal_cents)}</span>
        </div>
        {(o.shipping_cents ?? 0) > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="tabular-nums">{formatMoney(o.shipping_cents)}</span>
          </div>
        ) : null}
        {(o.tax_cents ?? 0) > 0 ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sales tax</span>
            <span className="tabular-nums">{formatMoney(o.tax_cents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-2 font-semibold">
          <span>Total paid</span>
          <span className="tabular-nums">{formatMoney(orderTotal)}</span>
        </div>
      </div>

      {(o.shipping_company || o.shipping_address || o.notes) && (
        <>
          <Separator className="my-8" />
          <h2 className="font-medium">Shipping & notes</h2>
          <div className="text-muted-foreground mt-2 space-y-2 text-sm">
            {o.shipping_company ? <p>Company: {o.shipping_company}</p> : null}
            {o.shipping_address ? <p className="whitespace-pre-wrap">{o.shipping_address}</p> : null}
            {o.notes ? <p className="whitespace-pre-wrap">Notes: {o.notes}</p> : null}
          </div>
        </>
      )}

      <p className="mt-10 text-center">
        <Link href="/orders" className="text-primary text-sm hover:underline">
          ← All orders
        </Link>
      </p>
    </PageShell>
  );
}
