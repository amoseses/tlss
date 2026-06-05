import Link from "next/link";
import { redirect } from "next/navigation";

import { completeCheckoutAction } from "@/app/actions/checkout";
import { PageShell } from "@/components/layout/page-shell";

type Props = { searchParams: Promise<{ payment_intent?: string }> };

export default async function CheckoutCompletePage({ searchParams }: Props) {
  const sp = await searchParams;
  const paymentIntentId = sp.payment_intent?.trim();

  if (!paymentIntentId) {
    return (
      <PageShell narrow>
        <p className="text-muted-foreground text-center text-sm">Missing payment reference.</p>
      </PageShell>
    );
  }

  try {
    const { orderId } = await completeCheckoutAction(paymentIntentId);
    redirect(`/orders/${orderId}?thanks=1`);
  } catch {
    return (
      <PageShell narrow>
        <p className="text-center text-sm">
          Your payment is processing. Refresh your{" "}
          <Link href="/orders" className="text-primary underline">
            order history
          </Link>{" "}
          in a moment.
        </p>
      </PageShell>
    );
  }
}
