"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateSellerOrderStatusAction } from "@/app/actions/admin-orders";
import type { OrderStatus, SellerOrder } from "@/types/database";

export function AdminOrderStatusSelect({ sellerOrder }: { sellerOrder: SellerOrder }) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as OrderStatus;
    startTransition(async () => {
      try {
        await updateSellerOrderStatusAction(sellerOrder.id, status);
        toast.success("Status updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update");
        e.target.value = sellerOrder.status;
      }
    });
  }

  return (
    <select
      value={sellerOrder.status}
      disabled={pending}
      onChange={onChange}
      className="border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs outline-none focus-visible:ring-ring focus-visible:ring-2"
    >
      <option value="pending">pending</option>
      <option value="confirmed">confirmed</option>
      <option value="fulfilled">fulfilled</option>
      <option value="cancelled">cancelled</option>
    </select>
  );
}
