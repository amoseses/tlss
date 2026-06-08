-- Givit gift concierge automation layer.
-- Adds opt-in recipient profiles, reminder notifications, approval bundles,
-- and fulfillment tasks for cards, flowers, seller-made items, shipped products,
-- and digital experiences/tickets.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists default_ship_to_line1 text,
  add column if not exists default_ship_to_line2 text,
  add column if not exists default_ship_to_city text,
  add column if not exists default_ship_to_state text,
  add column if not exists default_ship_to_zip text,
  add column if not exists default_ship_to_country text default 'US',
  add column if not exists gift_automation_enabled boolean not null default false,
  add column if not exists gift_approval_lead_days integer not null default 10;

create table if not exists public.gift_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  email text,
  phone text,
  default_budget_cents integer not null default 7500,
  interests text[] not null default '{}',
  avoid_terms text[] not null default '{}',
  notes text,
  ship_to_name text,
  ship_to_line1 text,
  ship_to_line2 text,
  ship_to_city text,
  ship_to_state text,
  ship_to_zip text,
  ship_to_country text not null default 'US',
  delivery_preference text not null default 'ship' check (delivery_preference in ('ship', 'email', 'either')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_occasions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.gift_recipients(id) on delete cascade,
  occasion text not null,
  occasion_date date not null,
  repeats_yearly boolean not null default true,
  approval_lead_days integer not null default 10,
  shipping_buffer_days integer not null default 5,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references public.gift_recipients(id) on delete cascade,
  occasion_id uuid references public.gift_occasions(id) on delete cascade,
  title text not null,
  body text not null,
  channel text not null check (channel in ('push', 'email', 'sms', 'in_app')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'approved', 'skipped', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.gift_recipients(id) on delete cascade,
  occasion_id uuid references public.gift_occasions(id) on delete set null,
  recommendation_id uuid references public.gift_recommendations(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'needs_approval', 'approved', 'regenerating', 'ordered', 'skipped', 'cancelled')),
  headline text not null,
  rationale text,
  card_message text,
  approval_token uuid not null default gen_random_uuid(),
  approved_at timestamptz,
  regenerated_at timestamptz,
  stripe_payment_intent_id text,
  total_cents integer not null default 0,
  estimated_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_approval_items (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.gift_approvals(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  item_type text not null check (item_type in ('gift', 'card', 'flowers', 'experience', 'shipping', 'service')),
  title text not null,
  description text,
  price_cents integer not null default 0,
  external_url text,
  fulfillment_status text not null default 'pending' check (fulfillment_status in ('pending', 'ordered', 'fulfilled', 'failed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_fulfillment_tasks (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.gift_approvals(id) on delete cascade,
  item_id uuid references public.gift_approval_items(id) on delete cascade,
  task_type text not null check (task_type in ('seller_order', 'affiliate_checkout', 'card_writer', 'florist', 'ticket_transfer', 'shipment')),
  provider text,
  status text not null default 'queued' check (status in ('queued', 'running', 'blocked', 'complete', 'failed')),
  run_after timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.gift_recipients enable row level security;
alter table public.gift_occasions enable row level security;
alter table public.gift_notifications enable row level security;
alter table public.gift_approvals enable row level security;
alter table public.gift_approval_items enable row level security;
alter table public.gift_fulfillment_tasks enable row level security;

do $$
begin
  create policy "gift recipients owner access" on public.gift_recipients
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift occasions owner access" on public.gift_occasions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift notifications owner access" on public.gift_notifications
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift approvals owner access" on public.gift_approvals
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift approval items owner access" on public.gift_approval_items
    for all using (
      exists (
        select 1 from public.gift_approvals approvals
        where approvals.id = gift_approval_items.approval_id
          and approvals.user_id = auth.uid()
      )
    ) with check (
      exists (
        select 1 from public.gift_approvals approvals
        where approvals.id = gift_approval_items.approval_id
          and approvals.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift fulfillment tasks owner access" on public.gift_fulfillment_tasks
    for all using (
      exists (
        select 1 from public.gift_approvals approvals
        where approvals.id = gift_fulfillment_tasks.approval_id
          and approvals.user_id = auth.uid()
      )
    ) with check (
      exists (
        select 1 from public.gift_approvals approvals
        where approvals.id = gift_fulfillment_tasks.approval_id
          and approvals.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

create index if not exists gift_recipients_user_id_idx on public.gift_recipients(user_id);
create index if not exists gift_occasions_user_date_idx on public.gift_occasions(user_id, occasion_date);
create index if not exists gift_notifications_due_idx on public.gift_notifications(status, scheduled_for);
create index if not exists gift_approvals_user_status_idx on public.gift_approvals(user_id, status);
create index if not exists gift_fulfillment_tasks_due_idx on public.gift_fulfillment_tasks(status, run_after);
