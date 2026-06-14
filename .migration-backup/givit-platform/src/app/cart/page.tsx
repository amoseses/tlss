import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCartId } from "@/app/actions/cart-helpers";
import { CartView, type CartLineVM } from "./cart-view";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cartId = await getOrCreateCartId(supabase, user.id);
  const { data: raw } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      quantity,
      product_id,
      products:products (id, name, slug, price_cents, min_order_qty, stock, images:product_images (storage_path, sort_order))
    `,
    )
    .eq("cart_id", cartId);

  const lines = (raw ?? []) as unknown as CartLineVM[];

  return (
    <PageShell>
      <PageHeader
        title="Cart"
        description={
          <>
            Review quantities before placing your wholesale order.{" "}
            <Link href="/products" className="text-primary underline-offset-4 hover:underline">
              Continue shopping
            </Link>
          </>
        }
      />
      <CartView lines={lines} />
    </PageShell>
  );
}
