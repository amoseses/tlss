"use client";

import { useState, type FormEvent } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getClientStripeKey } from "@/lib/commerce/stripe-checkout";
import type { CheckoutQuote } from "@/lib/commerce/types";

// ── Stripe promise cache ──────────────────────────────────────────
const stripePromises = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(key: string) {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key));
  return stripePromises.get(key)!;
}

// ── Types ─────────────────────────────────────────────────────────
type CheckoutPaymentProps = {
  /** The full checkout quote from the cart flow. */
  quote: CheckoutQuote;
  /** Called with the PaymentIntent id after a successful charge. */
  onSuccess: (paymentIntentId: string) => void;
  /** Called when the user wants to go back to shipping / review. */
  onBack?: () => void;
};

// ── Public component (wraps in Stripe Elements) ───────────────────
export function CheckoutPayment(props: CheckoutPaymentProps) {
  const publishableKey = getClientStripeKey();

  if (!publishableKey) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
        Stripe is not configured. Set <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to enable payments.
      </div>
    );
  }

  return (
    <Elements stripe={getStripePromise(publishableKey)}>
      <CheckoutPaymentForm {...props} />
    </Elements>
  );
}

// ── Internal form ─────────────────────────────────────────────────
function CheckoutPaymentForm({ quote, onSuccess, onBack }: CheckoutPaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe is still loading. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card form is not ready.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create a PaymentIntent on the server
      const intentRes = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartFingerprint: quote.cartFingerprint,
          totalCents: quote.totalCents,
          stripeTaxCalculationId: quote.stripeTaxCalculationId,
          sellerGroups: quote.sellerGroups.map((g) => ({
            sellerId: g.sellerId,
            merchandiseCents: g.merchandiseCents,
            shippingCents: g.shippingCents,
            taxCents: g.taxCents,
            platformFeeCents: g.platformFeeCents,
            sellerPayoutCents: g.sellerPayoutCents,
            stripeConnectAccountId: g.stripeConnectAccountId,
            shippoShipmentId: g.shippoShipmentId,
            shippoRateId: g.shippoRateId,
            shippingCarrier: g.shippingCarrier,
            shippingService: g.shippingService,
          })),
          shipTo: quote.shipTo,
        }),
      });

      const { clientSecret, error: intentError } = await intentRes.json();

      if (intentError || !clientSecret) {
        throw new Error(intentError ?? "Could not initialize payment.");
      }

      // 2. Confirm the card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            address: {
              line1: quote.billingAddress || quote.shipTo.line1,
              city: quote.shipTo.city,
              state: quote.shipTo.state,
              postal_code: quote.shipTo.zip,
              country: quote.shipTo.country,
            },
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Payment failed.");
      }

      if (result.paymentIntent?.status === "succeeded") {
        toast.success("Payment successful!");
        onSuccess(result.paymentIntent.id);
      } else if (result.paymentIntent?.status === "requires_action") {
        // 3D Secure / additional authentication
        toast.info("Additional authentication is required. Follow the prompts.");
        const confirmResult = await stripe.confirmCardPayment(clientSecret);
        if (confirmResult.error) {
          throw new Error(confirmResult.error.message ?? "Authentication failed.");
        }
        if (confirmResult.paymentIntent?.status === "succeeded") {
          toast.success("Payment successful!");
          onSuccess(confirmResult.paymentIntent.id);
        } else {
          toast.error(`Payment status: ${confirmResult.paymentIntent?.status}`);
        }
      } else {
        toast.error(`Unexpected payment status: ${result.paymentIntent?.status}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order summary */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-serif text-lg font-bold text-givit-ink">Order summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Merchandise</span>
            <span className="font-medium">${(quote.merchandiseCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">${(quote.shippingCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">${(quote.taxCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee</span>
            <span className="font-medium">${(quote.platformFeeCents / 100).toFixed(2)}</span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between text-base font-bold text-givit-ink">
            <span>Total</span>
            <span>${(quote.totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Card element */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-serif text-lg font-bold text-givit-ink">Payment</h3>
        <div className="rounded-xl border border-border bg-background p-4 transition focus-within:border-givit-ember focus-within:ring-1 focus-within:ring-givit-ember/20">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1a1a2e",
                  fontFamily: "inherit",
                  "::placeholder": { color: "#a0a0b0" },
                },
                invalid: { color: "#e53e3e" },
              },
            }}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Your card information is secure. Payments are processed by Stripe.
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <Button type="button" variant="outline" disabled={loading} onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover"
          disabled={!stripe || !cardComplete || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            `Pay $${(quote.totalCents / 100).toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}