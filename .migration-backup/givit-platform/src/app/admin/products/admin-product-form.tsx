"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createProductAction, updateProductAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Product } from "@/types/database";

type Props = {
  mode: "create" | "edit";
  product?: Product;
  categories: Category[];
};

export function AdminProductForm({ mode, product, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      description: String(fd.get("description")),
      sku: String(fd.get("sku")),
      price_dollars: String(fd.get("price_dollars")),
      weight_oz: String(fd.get("weight_oz")),
      min_order_qty: Number.parseInt(String(fd.get("min_order_qty")), 10) || 1,
      stock: Number.parseInt(String(fd.get("stock")), 10) || 0,
      is_published: fd.get("is_published") === "on",
      category_id: String(fd.get("category_id") || ""),
      gift_tags: String(fd.get("gift_tags") || "").split(",").map(s => s.trim()).filter(Boolean),
      occasion_tags: String(fd.get("occasion_tags") || "").split(",").map(s => s.trim()).filter(Boolean),
      relationship_tags: String(fd.get("relationship_tags") || "").split(",").map(s => s.trim()).filter(Boolean),
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          const id = await createProductAction(payload);
          toast.success("Product created");
          router.push(`/admin/products/${id}/edit`);
          router.refresh();
        } else if (product) {
          await updateProductAction(product.id, payload);
          toast.success("Saved");
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  const priceDollars =
    product != null ? (product.price_cents / 100).toFixed(2) : "";
  const weightOz =
    product != null ? String(product.weight_oz) : "";

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={product?.description ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" required defaultValue={product?.sku} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_dollars">Price (USD)</Label>
          <Input
            id="price_dollars"
            name="price_dollars"
            type="text"
            inputMode="decimal"
            required
            placeholder="24.99"
            defaultValue={priceDollars}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight_oz">Weight per unit (oz)</Label>
          <Input
            id="weight_oz"
            name="weight_oz"
            type="text"
            inputMode="decimal"
            required
            placeholder="16"
            defaultValue={weightOz}
          />
          <p className="text-muted-foreground text-xs">
            Required for checkout shipping quotes. Enter the weight of one unit.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_order_qty">Minimum order qty</Label>
          <Input
            id="min_order_qty"
            name="min_order_qty"
            type="number"
            min={1}
            required
            defaultValue={product?.min_order_qty ?? 1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            min={0}
            required
            defaultValue={product?.stock ?? 0}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category_id">Category</Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={product?.category_id ?? ""}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring focus-visible:ring-2"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {/* GIVIT — AI Gift Discovery Tags */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground mb-0.5">🎁 AI Gift Tags</p>
          <p className="text-xs text-muted-foreground">
            These tags help GIVIT&apos;s AI recommend this product. Separate values with commas.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gift_tags">Gift Tags</Label>
          <Input
            id="gift_tags"
            name="gift_tags"
            placeholder="cooking, kitchen, giftable, unique"
            defaultValue={((product as Record<string, unknown>)?.gift_tags as string[] | undefined)?.join(", ") ?? ""}
          />
          <p className="text-muted-foreground text-xs">Describe the product&apos;s category/vibe.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="occasion_tags">Occasion Tags</Label>
          <Input
            id="occasion_tags"
            name="occasion_tags"
            placeholder="birthday, holiday, anniversary, graduation"
            defaultValue={((product as Record<string, unknown>)?.occasion_tags as string[] | undefined)?.join(", ") ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship_tags">Relationship Tags</Label>
          <Input
            id="relationship_tags"
            name="relationship_tags"
            placeholder="mom, dad, friend, partner, coworker"
            defaultValue={((product as Record<string, unknown>)?.relationship_tags as string[] | undefined)?.join(", ") ?? ""}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_published"
          name="is_published"
          defaultChecked={product?.is_published ?? false}
          className="border-input size-4 rounded border"
        />
        <Label htmlFor="is_published" className="font-normal">
          Published on storefront
        </Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create & continue" : "Save changes"}
      </Button>
    </form>
  );
}
