"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  productId: string;
  minOrderQty: number;
  stock: number;
};

export function ProductAddToCart({ productId, minOrderQty, stock }: Props) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = Number.parseInt(String(fd.get("quantity")), 10);
    startTransition(async () => {
      try {
        await addToCartAction(productId, qty);
        toast.success("Added to cart");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add to cart");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="quantity" className="text-sm font-bold text-givit-ink">
          Quantity
        </Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={minOrderQty}
          max={stock}
          defaultValue={minOrderQty}
          required
          className="h-10 rounded-sm"
        />
        <p className="text-muted-foreground text-xs">
          Minimum order {minOrderQty} units · {stock} in stock
        </p>
      </div>
      <Button
        type="submit"
        className="h-10 w-full rounded-sm bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        disabled={pending || stock < minOrderQty}
      >
        {stock < minOrderQty ? "Out of stock" : pending ? "Adding…" : "Add to Cart"}
      </Button>
    </form>
  );
}
