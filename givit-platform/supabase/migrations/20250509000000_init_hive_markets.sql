-- Hive Markets — initial schema, RLS, storage, triggers

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('customer', 'staff', 'admin');

create type public.order_status as enum ('pending', 'confirmed', 'fulfilled', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sku text not null,
  price_cents int not null check (price_cents >= 0),
  min_order_qty int not null default 1 check (min_order_qty >= 1),
  stock int not null default 0 check (stock >= 0),
  is_published boolean not null default false,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  author_display_name text not null default '',
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedback_contact check (
    user_id is not null
    or (email is not null and length(trim(email)) > 0)
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal_cents int not null check (subtotal_cents >= 0),
  notes text,
  shipping_company text,
  shipping_address text,
  billing_company text,
  billing_address text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  product_name text not null
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unique (cart_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index products_category_id_idx on public.products (category_id);
create index products_slug_idx on public.products (slug);
create index reviews_product_id_idx on public.reviews (product_id);
create index order_items_order_id_idx on public.order_items (order_id);
create index orders_user_id_idx on public.orders (user_id);
create index cart_items_cart_id_idx on public.cart_items (cart_id);

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- New auth user → profile row (default role: customer)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff'::public.user_role, 'admin'::public.user_role)
  );
$$;

-- Customers cannot escalate their own role
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_staff() then
      raise exception 'Only staff can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_role
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_change();

create or replace function public.set_review_author_display()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(nullif(trim(full_name), ''), nullif(trim(email), ''), 'Customer')
    into new.author_display_name
  from public.profiles
  where id = new.user_id;
  return new;
end;
$$;

create trigger reviews_set_author_display
  before insert on public.reviews
  for each row
  execute function public.set_review_author_display();

-- Aggregated ratings (respects RLS on reviews via security_invoker)
create or replace view public.product_rating_stats
with (security_invoker = true) as
select
  product_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*)::int as review_count
from public.reviews
group by product_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.reviews enable row level security;
alter table public.feedback enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

-- profiles
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (auth.uid() = id or public.is_staff());

create policy "profiles_update_own_or_staff"
  on public.profiles for update
  using (auth.uid() = id or public.is_staff())
  with check (auth.uid() = id or public.is_staff());

-- categories: public read; staff write
create policy "categories_select_all"
  on public.categories for select
  using (true);

create policy "categories_staff_all"
  on public.categories for all
  using (public.is_staff())
  with check (public.is_staff());

-- products
create policy "products_select_published_or_staff"
  on public.products for select
  using (is_published or public.is_staff());

create policy "products_staff_insert"
  on public.products for insert
  with check (public.is_staff());

create policy "products_staff_update"
  on public.products for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "products_staff_delete"
  on public.products for delete
  using (public.is_staff());

-- product_images: visible if parent product is visible or staff
create policy "product_images_select"
  on public.product_images for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published = true
    )
  );

create policy "product_images_staff_all"
  on public.product_images for all
  using (public.is_staff())
  with check (public.is_staff());

-- reviews
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own_or_staff"
  on public.reviews for update
  using ( auth.uid() = user_id or public.is_staff() )
  with check ( auth.uid() = user_id or public.is_staff() );

create policy "reviews_delete_own_or_staff"
  on public.reviews for delete
  using ( auth.uid() = user_id or public.is_staff() );

-- feedback
create policy "feedback_insert_authenticated_or_guest"
  on public.feedback for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (
      auth.uid() is null
      and user_id is null
      and email is not null
    )
  );

create policy "feedback_select_staff"
  on public.feedback for select
  using (public.is_staff());

-- orders
create policy "orders_select_own_or_staff"
  on public.orders for select
  using (user_id = auth.uid() or public.is_staff());

create policy "orders_insert_own"
  on public.orders for insert
  with check (user_id = auth.uid());

create policy "orders_update_staff"
  on public.orders for update
  using (public.is_staff())
  with check (public.is_staff());

-- order_items
create policy "order_items_select_via_order"
  on public.order_items for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "order_items_insert_own_order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- carts
create policy "carts_select_own"
  on public.carts for select
  using (user_id = auth.uid());

create policy "carts_insert_own"
  on public.carts for insert
  with check (user_id = auth.uid());

create policy "carts_delete_own"
  on public.carts for delete
  using (user_id = auth.uid());

-- cart_items (via cart ownership)
create policy "cart_items_select_own"
  on public.cart_items for select
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

create policy "cart_items_insert_own"
  on public.cart_items for insert
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

create policy "cart_items_update_own"
  on public.cart_items for update
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

create policy "cart_items_delete_own"
  on public.cart_items for delete
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: product images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Staff upload / update / delete
create policy "product_images_staff_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.is_staff()
  );

create policy "product_images_staff_update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());

create policy "product_images_staff_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_staff());
