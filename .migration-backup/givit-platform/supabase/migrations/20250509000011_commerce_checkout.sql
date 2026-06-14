-- Commerce: product weight, seller ship-from, Stripe Connect, checkout totals, seller sub-orders.

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- ---------------------------------------------------------------------------
-- Products: weight required for shipping quotes (Option A)
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists weight_oz numeric(10, 2);

update public.products set weight_oz = 16 where weight_oz is null;

alter table public.products
  alter column weight_oz set not null;

alter table public.products
  add constraint products_weight_oz_positive check (weight_oz > 0);

-- ---------------------------------------------------------------------------
-- Seller fulfillment + Stripe Connect
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists ship_from_line1 text,
  add column if not exists ship_from_line2 text,
  add column if not exists ship_from_city text,
  add column if not exists ship_from_state text,
  add column if not exists ship_from_zip text,
  add column if not exists ship_from_country text not null default 'US',
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- Parent checkout orders
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists merchandise_cents int,
  add column if not exists shipping_cents int not null default 0,
  add column if not exists tax_cents int not null default 0,
  add column if not exists platform_fee_cents int not null default 0,
  add column if not exists total_cents int,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_tax_calculation_id text,
  add column if not exists ship_to_name text,
  add column if not exists ship_to_line1 text,
  add column if not exists ship_to_line2 text,
  add column if not exists ship_to_city text,
  add column if not exists ship_to_state text,
  add column if not exists ship_to_zip text,
  add column if not exists ship_to_country text not null default 'US';

update public.orders
set
  merchandise_cents = coalesce(merchandise_cents, subtotal_cents),
  total_cents = coalesce(total_cents, subtotal_cents)
where merchandise_cents is null or total_cents is null;

alter table public.orders
  alter column merchandise_cents set not null;

alter table public.orders
  alter column total_cents set not null;

create unique index if not exists orders_stripe_payment_intent_id_idx
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- Seller sub-orders (one per seller per checkout)
-- ---------------------------------------------------------------------------

create table if not exists public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  merchandise_cents int not null check (merchandise_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  platform_fee_cents int not null default 0 check (platform_fee_cents >= 0),
  seller_payout_cents int not null default 0 check (seller_payout_cents >= 0),
  shipping_carrier text,
  shipping_service text,
  shippo_shipment_id text,
  shippo_rate_id text,
  stripe_transfer_id text,
  created_at timestamptz not null default now()
);

create index if not exists seller_orders_order_id_idx on public.seller_orders (order_id);
create index if not exists seller_orders_seller_id_idx on public.seller_orders (seller_id);

alter table public.order_items
  add column if not exists seller_id uuid references public.profiles (id) on delete restrict,
  add column if not exists seller_order_id uuid references public.seller_orders (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Checkout quote snapshots (server-side, tied to PaymentIntent)
-- ---------------------------------------------------------------------------

create table if not exists public.checkout_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cart_fingerprint text not null,
  quote_json jsonb not null,
  stripe_payment_intent_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists checkout_quotes_user_id_idx on public.checkout_quotes (user_id);
create unique index if not exists checkout_quotes_pi_idx
  on public.checkout_quotes (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.seller_orders enable row level security;
alter table public.checkout_quotes enable row level security;

create policy "seller_orders_select_buyer_or_seller_or_admin"
  on public.seller_orders for select
  using (
    public.is_admin()
    or seller_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "seller_orders_update_own_seller_or_admin"
  on public.seller_orders for update
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

create policy "checkout_quotes_select_own"
  on public.checkout_quotes for select
  using (user_id = auth.uid());

create policy "checkout_quotes_insert_own"
  on public.checkout_quotes for insert
  with check (user_id = auth.uid());

create policy "checkout_quotes_update_own"
  on public.checkout_quotes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Parent orders: only paid orders should flip payment_status via service role / webhook.
-- Staff can still update fulfillment status on parent orders.
