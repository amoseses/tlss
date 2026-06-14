"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  createStripeConnectLinkAction,
  refreshStripeConnectStatusAction,
  updateShipFromAddressAction,
} from "@/app/actions/stripe-connect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/commerce/constants";

type Props = {
  shipFrom: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
  };
  chargesEnabled: boolean;
  hasConnectAccount: boolean;
};

export function SellerShippingForm({
  shipFrom,
  chargesEnabled,
  hasConnectAccount,
}: Props) {
  const [pending, startTransition] = useTransition();

  function saveShipFrom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateShipFromAddressAction({
          ship_from_line1: String(fd.get("ship_from_line1") ?? ""),
          ship_from_line2: String(fd.get("ship_from_line2") ?? ""),
          ship_from_city: String(fd.get("ship_from_city") ?? ""),
          ship_from_state: String(fd.get("ship_from_state") ?? ""),
          ship_from_zip: String(fd.get("ship_from_zip") ?? ""),
        });
        toast.success("Ship-from address saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save address");
      }
    });
  }

  function connectStripe() {
    startTransition(async () => {
      try {
        const { url } = await createStripeConnectLinkAction();
        window.location.href = url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start Stripe onboarding");
      }
    });
  }

  function refreshStripe() {
    startTransition(async () => {
      try {
        const { chargesEnabled: enabled } = await refreshStripeConnectStatusAction();
        toast.success(enabled ? "Stripe payouts enabled" : "Stripe onboarding still incomplete");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not refresh Stripe status");
      }
    });
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Ship-from address</h2>
          <p className="text-muted-foreground text-sm">
            Used to quote Ground shipping at checkout. This is where packages enter the carrier network
            (your studio or warehouse — not a drop-off store name).
          </p>
        </div>
        <form onSubmit={saveShipFrom} className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ship_from_line1">Street address</Label>
            <Input
              id="ship_from_line1"
              name="ship_from_line1"
              required
              defaultValue={shipFrom.line1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ship_from_line2">Apt / suite (optional)</Label>
            <Input id="ship_from_line2" name="ship_from_line2" defaultValue={shipFrom.line2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="ship_from_city">City</Label>
              <Input id="ship_from_city" name="ship_from_city" required defaultValue={shipFrom.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ship_from_state">State</Label>
              <select
                id="ship_from_state"
                name="ship_from_state"
                required
                defaultValue={shipFrom.state || ""}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring focus-visible:ring-2"
              >
                <option value="" disabled>
                  State
                </option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ship_from_zip">ZIP</Label>
              <Input id="ship_from_zip" name="ship_from_zip" required defaultValue={shipFrom.zip} />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            Save ship-from address
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Stripe payouts</h2>
          <p className="text-muted-foreground text-sm">
            Connect your bank account to receive payouts when buyers check out. Required before your
            products can be purchased online.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              chargesEnabled
                ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900"
            }
          >
            {chargesEnabled ? "Ready to accept payments" : "Onboarding incomplete"}
          </span>
          <Button type="button" disabled={pending} onClick={connectStripe}>
            {hasConnectAccount ? "Continue Stripe setup" : "Connect with Stripe"}
          </Button>
          {hasConnectAccount ? (
            <Button type="button" variant="outline" disabled={pending} onClick={refreshStripe}>
              Refresh status
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
