import {
  DEFAULT_PARCEL,
  MAX_SHIPMENT_WEIGHT_OZ,
} from "@/lib/commerce/constants";
import type { CheckoutAddress, ShipFromAddress } from "@/lib/commerce/types";
import { getShippoApiToken } from "@/lib/env/commerce";

type ShippoServiceLevel = {
  token?: string;
  name?: string;
};

type ShippoRate = {
  object_id: string;
  amount: string;
  provider: string;
  servicelevel?: ShippoServiceLevel;
};

type ShippoShipment = {
  object_id: string;
  rates: ShippoRate[];
  messages?: { text?: string }[];
};

function isGroundRate(rate: ShippoRate): boolean {
  const token = rate.servicelevel?.token?.toLowerCase() ?? "";
  const name = rate.servicelevel?.name?.toLowerCase() ?? "";
  return token.includes("ground") || name.includes("ground");
}

function shippoAddress(from: ShipFromAddress | CheckoutAddress, name?: string) {
  return {
    name: name || ("name" in from ? from.name : "Seller"),
    company: "company" in from && from.company ? from.company : "",
    street1: from.line1,
    street2: from.line2 || "",
    city: from.city,
    state: from.state,
    zip: from.zip,
    country: from.country || "US",
  };
}

export async function quoteCheapestGroundShipping(input: {
  from: ShipFromAddress;
  fromName: string;
  to: CheckoutAddress;
  totalWeightOz: number;
}): Promise<{
  amountCents: number;
  carrier: string;
  service: string;
  shipmentId: string;
  rateId: string;
}> {
  if (input.totalWeightOz <= 0) {
    throw new Error("Shipment weight must be greater than zero.");
  }
  if (input.totalWeightOz > MAX_SHIPMENT_WEIGHT_OZ) {
    throw new Error(
      "This order exceeds automatic parcel shipping limits. Contact the seller to arrange shipping.",
    );
  }

  const response = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${getShippoApiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: shippoAddress(input.from, input.fromName),
      address_to: shippoAddress(input.to),
      parcels: [
        {
          weight: String(input.totalWeightOz),
          mass_unit: "oz",
          length: DEFAULT_PARCEL.length,
          width: DEFAULT_PARCEL.width,
          height: DEFAULT_PARCEL.height,
          distance_unit: DEFAULT_PARCEL.distance_unit,
        },
      ],
      async: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shippo rate request failed: ${body.slice(0, 200)}`);
  }

  const shipment = (await response.json()) as ShippoShipment;
  const groundRates = (shipment.rates ?? []).filter(isGroundRate);

  if (groundRates.length === 0) {
    const hint = shipment.messages?.[0]?.text;
    throw new Error(
      hint ||
        "No Ground shipping rate is available for this address. Try a different ship-to or contact the seller.",
    );
  }

  groundRates.sort(
    (a, b) => Number.parseFloat(a.amount) - Number.parseFloat(b.amount),
  );
  const best = groundRates[0]!;

  return {
    amountCents: Math.round(Number.parseFloat(best.amount) * 100),
    carrier: best.provider,
    service: best.servicelevel?.name ?? "Ground",
    shipmentId: shipment.object_id,
    rateId: best.object_id,
  };
}
