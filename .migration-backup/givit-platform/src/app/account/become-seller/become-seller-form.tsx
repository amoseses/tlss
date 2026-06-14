"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { registerAsSellerAction } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  defaultCompanyName?: string | null;
};

export function BecomeSellerForm({ defaultCompanyName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await registerAsSellerAction({
          company_name: String(fd.get("company_name")),
          business_description: String(fd.get("business_description") ?? ""),
        });
        toast.success("You’re now a seller — welcome to the console.");
        router.push("/admin?welcome=seller");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Registration failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company_name">Business / company name</Label>
        <Input
          id="company_name"
          name="company_name"
          required
          defaultValue={defaultCompanyName ?? ""}
          placeholder="Acme Wholesale LLC"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="business_description">What will you sell? (optional)</Label>
        <Textarea
          id="business_description"
          name="business_description"
          rows={4}
          placeholder="Categories, brands, or products you plan to list on GIVIT."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Activating seller account…" : "Become a seller"}
      </Button>
      <p className="text-muted-foreground text-xs leading-relaxed">
        You will get access to the seller console to add products, manage orders, and read buyer
        feedback. This action cannot be undone from the website — contact support if you need to
        switch back to buyer-only access.
      </p>
    </form>
  );
}
