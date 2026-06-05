"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteProductAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";

export function AdminDeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm("Delete this product and its images? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteProductAction(productId);
        toast.success("Product deleted");
        router.push("/admin/products");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={pending} onClick={onDelete}>
      {pending ? "Deleting…" : "Delete product"}
    </Button>
  );
}
