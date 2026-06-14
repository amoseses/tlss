"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { completeCheckoutAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

import type { CheckoutQuoteResponse } from "@/app/actions/checkout";

type Props = {
  clientSecret: string;
  quote: CheckoutQuoteResponse["quote"];
};

export function CheckoutPayment({ clientSecret, quote }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  async function onPay() {
    if (!stripe || !elements) return;

    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`,
        },
      });

      if (error) {
        toast.error(error.message ?? "Payment failed");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const { orderId } = await completeCheckoutAction(paymentIntent.id);
        router.push(`/orders/${orderId}?thanks=1`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-4 text-sm">
        <h3 className="font-medium">Shipping & tax</h3>
        <ul className="mt-3 space-y-2">
          {quote.sellerGroups.map((group) => (
            <li key={group.sellerName} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {group.sellerName} — {group.shippingCarrier} {group.shippingService}
              </span>
              <span className="tabular-nums">{formatMoney(group.shippingCents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Merchandise</span>
            <span className="tabular-nums">{formatMoney(quote.merchandiseCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="tabular-nums">{formatMoney(quote.shippingCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sales tax</span>
            <span className="tabular-nums">{formatMoney(quote.taxCents)}</span>
          </div>
          <div className="flex justify-between pt-2 font-semibold">
            <span>Total due now</span>
            <span className="tabular-nums">{formatMoney(quote.totalCents)}</span>
          </div>
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      <Button type="button" className="w-full" disabled={!stripe || !elements || paying} onClick={onPay}>
        {paying ? "Processing…" : `Pay ${formatMoney(quote.totalCents)}`}
      </Button>

      <p className="text-muted-foreground text-xs">
        Payment is processed securely by Stripe. Each seller receives their share minus the 10% platform
        fee on merchandise.
      </p>
    </div>
  );
}
