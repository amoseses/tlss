export type CheckoutAddress = {
  name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
};

export type CheckoutQuoteLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  weightOz: number;
};

export type SellerQuoteGroup = {
  sellerId: string;
  sellerName: string;
  stripeConnectAccountId: string;
  lines: CheckoutQuoteLine[];
  merchandiseCents: number;
  platformFeeCents: number;
  shippingCents: number;
  taxCents: number;
  sellerPayoutCents: number;
  shippingCarrier: string;
  shippingService: string;
  shippoShipmentId: string;
  shippoRateId: string;
};

export type CheckoutQuote = {
  merchandiseCents: number;
  shippingCents: number;
  taxCents: number;
  platformFeeCents: number;
  totalCents: number;
  stripeTaxCalculationId: string;
  sellerGroups: SellerQuoteGroup[];
  cartFingerprint: string;
  shipTo: CheckoutAddress;
  notes: string;
  billingCompany: string;
  billingAddress: string;
};

export type ShipFromAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};
