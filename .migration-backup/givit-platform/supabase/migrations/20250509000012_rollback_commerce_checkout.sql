-- Rollback for 20250509000011_commerce_checkout.sql
-- Run in Supabase SQL editor ONLY if you want to undo that migration.
--
-- WARNING:
-- - Drops seller_orders and checkout_quotes (and related order_items links).
-- - Removes payment/shipping/tax columns from orders and weight from products.
-- - Your app code may still expect these objects until you revert the codebase too.

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists "checkout_quotes_update_own" on public.checkout_quotes;
drop policy if exists "checkout_quotes_insert_own" on public.checkout_quotes;
drop policy if exists "checkout_quotes_select_own" on public.checkout_quotes;
drop policy if exists "seller_orders_update_own_seller_or_admin" on public.seller_orders;
drop policy if exists "seller_orders_select_buyer_or_seller_or_admin" on public.seller_orders;

-- ---------------------------------------------------------------------------
-- Checkout quotes
-- ---------------------------------------------------------------------------

drop table if exists public.checkout_quotes;

-- ---------------------------------------------------------------------------
-- Seller sub-orders (drop FKs from order_items first)
-- ---------------------------------------------------------------------------

alter table public.order_items
  drop column if exists seller_order_id,
  drop column if exists seller_id;

drop table if exists public.seller_orders;

-- ---------------------------------------------------------------------------
-- Orders — extended checkout columns
-- ---------------------------------------------------------------------------

drop index if exists public.orders_stripe_payment_intent_id_idx;

alter table public.orders
  drop column if exists payment_status,
  drop column if exists merchandise_cents,
  drop column if exists shipping_cents,
  drop column if exists tax_cents,
  drop column if exists platform_fee_cents,
  drop column if exists total_cents,
  drop column if exists stripe_payment_intent_id,
  drop column if exists stripe_tax_calculation_id,
  drop column if exists ship_to_name,
  drop column if exists ship_to_line1,
  drop column if exists ship_to_line2,
  drop column if exists ship_to_city,
  drop column if exists ship_to_state,
  drop column if exists ship_to_zip,
  drop column if exists ship_to_country;

-- ---------------------------------------------------------------------------
-- Profiles — ship-from + Stripe Connect
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop column if exists ship_from_line1,
  drop column if exists ship_from_line2,
  drop column if exists ship_from_city,
  drop column if exists ship_from_state,
  drop column if exists ship_from_zip,
  drop column if exists ship_from_country,
  drop column if exists stripe_connect_account_id,
  drop column if exists stripe_connect_charges_enabled;

-- ---------------------------------------------------------------------------
-- Products — weight
-- ---------------------------------------------------------------------------

alter table public.products
  drop constraint if exists products_weight_oz_positive;

alter table public.products
  drop column if exists weight_oz;

-- ---------------------------------------------------------------------------
-- Enum (after orders.payment_status is gone)
-- ---------------------------------------------------------------------------

drop type if exists public.payment_status;
