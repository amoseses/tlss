/// <reference path="../mjs-modules.d.ts" />
// After the client confirms a SetupIntent, it only gets back a
// payment_method ID -- Stripe.js deliberately doesn't hand back card
// details in the browser. This looks the card up server-side (secret key)
// so the wizard can show/store a real brand and last 4 instead of ones
// computed client-side from a raw, untokenized number.
import { getUserFromRequest } from "../_lib/auth.mjs";
import { getPaymentMethodSummary } from "../_lib/payments.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }

    const paymentMethodId = req.body?.paymentMethodId;
    if (!paymentMethodId || typeof paymentMethodId !== "string") {
      res.status(400).json({ error: "Missing paymentMethodId." });
      return;
    }

    const summary = await getPaymentMethodSummary(paymentMethodId);
    res.status(200).json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Couldn't retrieve card details." });
  }
}
