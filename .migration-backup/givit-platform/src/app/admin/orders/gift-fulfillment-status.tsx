"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateGiftFulfillmentStatusAction } from "@/app/actions/admin-orders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses = ["paid_pending_fulfillment", "ordered", "shipped", "delivered"];

export function GiftFulfillmentStatusSelect({ approvalId, status }: { approvalId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  return (
    <Select value={value} disabled={pending} onValueChange={(next) => {
      if (!next) return;
      setValue(next);
      startTransition(async () => {
        try {
          await updateGiftFulfillmentStatusAction(approvalId, next);
          toast.success("Gift order status updated.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not update status.");
          setValue(value);
        }
      });
    }}>
      <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
      <SelectContent>{statuses.map((statusOption) => <SelectItem key={statusOption} value={statusOption}>{statusOption === "paid_pending_fulfillment" ? "Paid - Pending Fulfillment" : statusOption}</SelectItem>)}</SelectContent>
    </Select>
  );
}
