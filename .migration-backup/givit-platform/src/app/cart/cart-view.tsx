"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeCartLineAction, updateCartLineAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { publicStorageUrl } from "@/lib/storage";

export type CartLineVM = {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    min_order_qty: number;
    stock: number;
    images: { storage_path: string; sort_order: number }[];
  } | null;
};

export function CartView({ lines }: { lines: CartLineVM[] }) {
  const [pending, startTransition] = useTransition();

  function updateLine(id: string, quantity: number) {
    startTransition(async () => {
      try {
        await updateCartLineAction(id, quantity);
        toast.success("Cart updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update");
      }
    });
  }

  function removeLine(id: string) {
    startTransition(async () => {
      try {
        await removeCartLineAction(id);
        toast.success("Removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove");
      }
    });
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Browse catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {lines.map((line) => {
          const p = line.products;
          if (!p) return null;
          const sorted = [...p.images].sort((a, b) => a.sort_order - b.sort_order);
          const img = sorted[0];
          return (
            <li key={line.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="bg-muted/30 relative h-24 w-24 shrink-0 overflow-hidden rounded-md border">
                {img ? (
                  <Image
                    src={publicStorageUrl(img.storage_path)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${p.slug}`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-muted-foreground text-sm">
                  {formatMoney(p.price_cents)} each · Min {p.min_order_qty}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={p.min_order_qty}
                  max={p.stock}
                  defaultValue={line.quantity}
                  className="w-24"
                  disabled={pending}
                  onBlur={(e) => {
                    const v = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) updateLine(line.id, v);
                  }}
                />
                <Button variant="outline" size="sm" type="button" disabled={pending} onClick={() => removeLine(line.id)}>
                  Remove
                </Button>
              </div>
              <div className="text-right font-medium tabular-nums sm:min-w-[100px]">
                {formatMoney(p.price_cents * line.quantity)}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col items-end gap-4 border-t pt-6">
        <p className="text-lg">
          Subtotal{" "}
          <span className="font-semibold tabular-nums">
            {formatMoney(
              lines.reduce((acc, line) => {
                const p = line.products;
                return acc + (p ? p.price_cents * line.quantity : 0);
              }, 0),
            )}
          </span>
        </p>
        <Button asChild size="lg">
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
      </div>
    </div>
  );
}
