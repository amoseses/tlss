import { createHash } from "crypto";

import { PLATFORM_FEE_RATE } from "@/lib/commerce/constants";
import type {
  CheckoutAddress,
  CheckoutQuote,
  CheckoutQuoteLine,
  SellerQuoteGroup,
  ShipFromAddress,
} from "@/lib/commerce/types";
import { quoteCheapestGroundShipping } from "@/lib/shippo";
import { getStripe } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

type CartProduct = {
  id: string;
  name: string;
  price_cents: number;
  min_order_qty: number;
  stock: number;
  is_published: boolean;
  weight_oz: number;
  seller_id: string | null;
};

type CartLineRow = {
  id: string;
  quantity: number;
  product_id: string;
  products: CartProduct | null;
};

type SellerProfile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  ship_from_line1: string | null;
  ship_from_line2: string | null;
  ship_from_city: string | null;
  ship_from_state: string | null;
  ship_from_zip: string | null;
  ship_from_country: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
};

export type ValidatedCartLine = {
  cartItemId: string;
  product: CartProduct;
  quantity: number;
};

export async function loadValidatedCart(
  supabase: SupabaseClient,
  userId: string,
): Promise<ValidatedCartLine[]> {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cart) return [];

  const { data: rawLines, error: linesError } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, product_id, products:products!inner (id, name, price_cents, min_order_qty, stock, is_published, weight_oz, seller_id)",
    )
    .eq("cart_id", cart.id);

  if (linesError) throw linesError;

  const lines = (rawLines ?? []) as unknown as CartLineRow[];
  const validated: ValidatedCartLine[] = [];

  for (const line of lines) {
    const p = line.products;
    if (!p || !p.is_published) {
      throw new Error("A product in your cart is no longer available.");
    }
    if (!p.seller_id) {
      throw new Error(`"${p.name}" is missing a seller and cannot be purchased.`);
    }
    if (line.quantity < p.min_order_qty) {
      throw new Error(`"${p.name}" requires a minimum quantity of ${p.min_order_qty}.`);
    }
    if (line.quantity > p.stock) {
      throw new Error(`Not enough stock for "${p.name}".`);
    }
    if (!p.weight_oz || p.weight_oz <= 0) {
      throw new Error(`"${p.name}" is missing shipping weight. Contact the seller.`);
    }

    validated.push({ cartItemId: line.id, product: p, quantity: line.quantity });
  }

  return validated;
}

function sellerDisplayName(profile: SellerProfile): string {
  return profile.company_name?.trim() || profile.full_name?.trim() || "Seller";
}

function shipFromFromProfile(profile: SellerProfile): ShipFromAddress {
  if (
    !profile.ship_from_line1?.trim() ||
    !profile.ship_from_city?.trim() ||
    !profile.ship_from_state?.trim() ||
    !profile.ship_from_zip?.trim()
  ) {
    throw new Error(
      `${sellerDisplayName(profile)} has not configured a ship-from address. Checkout cannot continue for their items.`,
    );
  }

  return {
    line1: profile.ship_from_line1.trim(),
    line2: profile.ship_from_line2?.trim() ?? "",
    city: profile.ship_from_city.trim(),
    state: profile.ship_from_state.trim().toUpperCase(),
    zip: profile.ship_from_zip.trim(),
    country: profile.ship_from_country?.trim() || "US",
  };
}

function cartFingerprint(lines: ValidatedCartLine[]): string {
  const payload = lines
    .map((l) => `${l.product.id}:${l.quantity}:${l.product.price_cents}`)
    .sort()
    .join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export async function buildCheckoutQuote(input: {
  lines: ValidatedCartLine[];
  shipTo: CheckoutAddress;
  notes: string;
  billingCompany: string;
  billingAddress: string;
  sellerProfiles: Map<string, SellerProfile>;
}): Promise<CheckoutQuote> {
  const grouped = new Map<string, ValidatedCartLine[]>();
  for (const line of input.lines) {
    const sellerId = line.product.seller_id!;
    const bucket = grouped.get(sellerId) ?? [];
    bucket.push(line);
    grouped.set(sellerId, bucket);
  }

  const sellerGroups: SellerQuoteGroup[] = [];

  for (const [sellerId, sellerLines] of grouped) {
    const profile = input.sellerProfiles.get(sellerId);
    if (!profile) {
      throw new Error("A seller profile could not be loaded for items in your cart.");
    }
    if (!profile.stripe_connect_account_id || !profile.stripe_connect_charges_enabled) {
      throw new Error(
        `${sellerDisplayName(profile)} is not ready to accept payments yet. Remove their items or try again later.`,
      );
    }

    const quoteLines: CheckoutQuoteLine[] = sellerLines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPriceCents: line.product.price_cents,
      weightOz: Number(line.product.weight_oz),
    }));

    const merchandiseCents = quoteLines.reduce(
      (sum, line) => sum + line.unitPriceCents * line.quantity,
      0,
    );
    const platformFeeCents = Math.round(merchandiseCents * PLATFORM_FEE_RATE);
    const totalWeightOz = quoteLines.reduce(
      (sum, line) => sum + line.weightOz * line.quantity,
      0,
    );

    const shipFrom = shipFromFromProfile(profile);
    const shipping = await quoteCheapestGroundShipping({
      from: shipFrom,
      fromName: sellerDisplayName(profile),
      to: input.shipTo,
      totalWeightOz,
    });

    sellerGroups.push({
      sellerId,
      sellerName: sellerDisplayName(profile),
      stripeConnectAccountId: profile.stripe_connect_account_id,
      lines: quoteLines,
      merchandiseCents,
      platformFeeCents,
      shippingCents: shipping.amountCents,
      taxCents: 0,
      sellerPayoutCents: merchandiseCents - platformFeeCents + shipping.amountCents,
      shippingCarrier: shipping.carrier,
      shippingService: shipping.service,
      shippoShipmentId: shipping.shipmentId,
      shippoRateId: shipping.rateId,
    });
  }

  const stripe = getStripe();
  const taxLineItems = sellerGroups.flatMap((group) => [
    {
      amount: group.merchandiseCents,
      reference: `seller:${group.sellerId}:merchandise`,
      tax_code: "txcd_99999999",
    },
    {
      amount: group.shippingCents,
      reference: `seller:${group.sellerId}:shipping`,
      tax_code: "txcd_92010001",
    },
  ]);

  const taxCalculation = await stripe.tax.calculations.create({
    currency: "usd",
    line_items: taxLineItems,
    customer_details: {
      address: {
        line1: input.shipTo.line1,
        line2: input.shipTo.line2 || undefined,
        city: input.shipTo.city,
        state: input.shipTo.state,
        postal_code: input.shipTo.zip,
        country: input.shipTo.country,
      },
      address_source: "shipping",
    },
  });

  const taxByReference = new Map<string, number>();
  for (const item of taxCalculation.line_items?.data ?? []) {
    taxByReference.set(item.reference, item.amount_tax ?? 0);
  }

  let merchandiseCents = 0;
  let shippingCents = 0;
  let platformFeeCents = 0;
  let taxCents = 0;

  for (const group of sellerGroups) {
    const merchandiseTax = taxByReference.get(`seller:${group.sellerId}:merchandise`) ?? 0;
    const shippingTax = taxByReference.get(`seller:${group.sellerId}:shipping`) ?? 0;
    group.taxCents = merchandiseTax + shippingTax;
    merchandiseCents += group.merchandiseCents;
    shippingCents += group.shippingCents;
    platformFeeCents += group.platformFeeCents;
    taxCents += group.taxCents;
  }

  if (!taxCalculation.id) {
    throw new Error("Could not calculate sales tax for this address.");
  }

  return {
    merchandiseCents,
    shippingCents,
    taxCents,
    platformFeeCents,
    totalCents: taxCalculation.amount_total ?? merchandiseCents + shippingCents + taxCents,
    stripeTaxCalculationId: taxCalculation.id,
    sellerGroups,
    cartFingerprint: cartFingerprint(input.lines),
    shipTo: input.shipTo,
    notes: input.notes,
    billingCompany: input.billingCompany,
    billingAddress: input.billingAddress,
  };
}

export async function loadSellerProfiles(
  supabase: SupabaseClient,
  sellerIds: string[],
): Promise<Map<string, SellerProfile>> {
  if (sellerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, company_name, ship_from_line1, ship_from_line2, ship_from_city, ship_from_state, ship_from_zip, ship_from_country, stripe_connect_account_id, stripe_connect_charges_enabled",
    )
    .in("id", sellerIds);

  if (error) throw error;

  const map = new Map<string, SellerProfile>();
  for (const row of (data ?? []) as SellerProfile[]) {
    map.set(row.id, row);
  }
  return map;
}

export function formatShippingAddress(address: CheckoutAddress): string {
  const parts = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.zip}`,
    address.country,
  ].filter(Boolean);
  return parts.join("\n");
}
