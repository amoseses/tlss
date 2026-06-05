"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { addProductImageRecordAction, deleteProductImageAction } from "@/app/actions/admin-products";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { publicStorageUrl } from "@/lib/storage";
import type { ProductImage } from "@/types/database";

export function AdminProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    startTransition(async () => {
      try {
        const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${productId}/${crypto.randomUUID()}-${safe}`;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        const nextSort = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
        await addProductImageRecordAction(productId, path, nextSort);
        toast.success("Image uploaded");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function removeImage(id: string) {
    startTransition(async () => {
      try {
        await deleteProductImageAction(id);
        toast.success("Image removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove");
      }
    });
  }

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={onFileChange}
          className="text-muted-foreground max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {sorted.map((img) => (
          <div key={img.id} className="group border-muted relative w-28 overflow-hidden rounded-md border">
            <div className="bg-muted relative aspect-square">
              <Image
                src={publicStorageUrl(img.storage_path)}
                alt=""
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="absolute right-1 top-1 h-7 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              type="button"
              disabled={pending}
              onClick={() => removeImage(img.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
