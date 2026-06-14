import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCartId } from "@/app/actions/cart-helpers";
import { formatMoney } from "@/lib/format";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cartId = await getOrCreateCartId(supabase, user.id);
  const { data: raw } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, products:products!inner (name, price_cents, min_order_qty, stock, is_published)",
    )
    .eq("cart_id", cartId);

  type Row = {
    id: string;
    quantity: number;
    products: {
      name: string;
      price_cents: number;
      min_order_qty: number;
      stock: number;
      is_published: boolean;
    };
  };

  const lines = (raw ?? []) as unknown as Row[];

  let subtotal = 0;
  let block = false;
  for (const line of lines) {
    const p = line.products;
    if (!p.is_published || line.quantity > p.stock || line.quantity < p.min_order_qty) {
      block = true;
    }
    subtotal += p.price_cents * line.quantity;
  }

  if (lines.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Checkout" description="Your cart is empty." />
        <div className="flex justify-center">
          <Link href="/products" className="text-primary underline">
            Browse products
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell wide className="max-w-5xl">
      <PageHeader
        title="Checkout"
        description="Enter your US ship-to address, review Ground shipping per seller, pay securely at checkout. Sales tax is calculated for your jurisdiction."
      />
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {block ? (
          <p className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-md border px-3 py-2 text-sm">
            Some line items need attention (stock or minimum quantity).{" "}
            <Link href="/cart" className="font-medium underline">
              Return to cart
            </Link>
          </p>
        ) : null}
        <div className="mt-8">
          <CheckoutForm disabled={block} />
        </div>
      </div>
      <aside className="lg:col-span-2">
        <div className="bg-card rounded-lg border p-6">
          <h2 className="font-medium">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {line.products.name}{" "}
                  <span className="text-foreground">× {line.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(line.products.price_cents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
        </div>
      </aside>
      </div>
    </PageShell>
  );
}
