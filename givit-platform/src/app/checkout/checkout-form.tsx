"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { prepareCheckoutAction, type CheckoutQuoteResponse } from "@/app/actions/checkout";
import { CheckoutPayment } from "@/components/checkout/checkout-payment";
import { US_STATES } from "@/lib/commerce/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type Props = {
  disabled?: boolean;
};

export function CheckoutForm({ disabled = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [checkout, setCheckout] = useState<CheckoutQuoteResponse | null>(null);

  const elementsOptions = useMemo(
    () =>
      checkout
        ? {
            clientSecret: checkout.clientSecret,
            appearance: { theme: "stripe" as const },
          }
        : null,
    [checkout],
  );

  function onSubmitAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await prepareCheckoutAction({
          ship_to_name: String(fd.get("ship_to_name") ?? ""),
          shipping_company: String(fd.get("shipping_company") ?? ""),
          ship_to_line1: String(fd.get("ship_to_line1") ?? ""),
          ship_to_line2: String(fd.get("ship_to_line2") ?? ""),
          ship_to_city: String(fd.get("ship_to_city") ?? ""),
          ship_to_state: String(fd.get("ship_to_state") ?? ""),
          ship_to_zip: String(fd.get("ship_to_zip") ?? ""),
          billing_company: String(fd.get("billing_company") ?? ""),
          billing_address: String(fd.get("billing_address") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        });
        setCheckout(result);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not prepare checkout");
      }
    });
  }

  if (checkout && elementsOptions) {
    return (
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CheckoutPayment clientSecret={checkout.clientSecret} quote={checkout.quote} />
      </Elements>
    );
  }

  return (
    <form onSubmit={onSubmitAddress} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ship_to_name">Recipient name</Label>
          <Input id="ship_to_name" name="ship_to_name" required placeholder="Jane Buyer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipping_company">Ship to — company</Label>
          <Input id="shipping_company" name="shipping_company" placeholder="Business legal name" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ship_to_line1">Street address</Label>
          <Input id="ship_to_line1" name="ship_to_line1" required placeholder="123 Market St" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ship_to_line2">Apt / suite (optional)</Label>
          <Input id="ship_to_line2" name="ship_to_line2" placeholder="Suite 400" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship_to_city">City</Label>
          <Input id="ship_to_city" name="ship_to_city" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship_to_state">State</Label>
          <select
            id="ship_to_state"
            name="ship_to_state"
            required
            defaultValue=""
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring focus-visible:ring-2"
          >
            <option value="" disabled>
              Select state
            </option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ship_to_zip">ZIP code</Label>
          <Input id="ship_to_zip" name="ship_to_zip" required placeholder="94103" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="billing_company">Bill to — company (optional)</Label>
          <Input id="billing_company" name="billing_company" placeholder="Accounts payable entity" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="billing_address">Bill to — address (optional)</Label>
          <Textarea id="billing_address" name="billing_address" rows={2} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Order notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Delivery window, dock instructions…" />
        </div>
      </div>
      <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
        {pending ? "Calculating shipping & tax…" : "Continue to payment"}
      </Button>
    </form>
  );
}
