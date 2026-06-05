-- Per-seller product ownership: staff see/edit only their products; admins see all.

create or replace function public.is_admin()
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
      and p.role = 'admin'::public.user_role
  );
$$;

alter table public.products
  add column if not exists seller_id uuid references public.profiles (id) on delete restrict;

create index if not exists products_seller_id_idx on public.products (seller_id);

-- ---------------------------------------------------------------------------
-- Products RLS: replace staff-wide access with seller-scoped access
-- ---------------------------------------------------------------------------

drop policy if exists "products_select_published_or_staff" on public.products;
drop policy if exists "products_staff_insert" on public.products;
drop policy if exists "products_staff_update" on public.products;
drop policy if exists "products_staff_delete" on public.products;

create policy "products_select_published"
  on public.products for select
  using (
    is_published = true
    and (
      not public.is_staff()
      or seller_id = auth.uid()
      or public.is_admin()
    )
  );

create policy "products_select_own_seller"
  on public.products for select
  using (seller_id = auth.uid());

create policy "products_select_admin"
  on public.products for select
  using (public.is_admin());

create policy "products_insert_seller"
  on public.products for insert
  with check (
    public.is_staff()
    and (seller_id = auth.uid() or public.is_admin())
  );

create policy "products_update_own_seller"
  on public.products for update
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

create policy "products_delete_own_seller"
  on public.products for delete
  using (seller_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Product images RLS
-- ---------------------------------------------------------------------------

drop policy if exists "product_images_select" on public.product_images;
drop policy if exists "product_images_staff_all" on public.product_images;

create policy "product_images_select"
  on public.product_images for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (
          (p.is_published = true and (not public.is_staff() or p.seller_id = auth.uid() or public.is_admin()))
          or p.seller_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy "product_images_insert_own"
  on public.product_images for insert
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "product_images_update_own"
  on public.product_images for update
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "product_images_delete_own"
  on public.product_images for delete
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Triggers: auto-set seller on create; prevent seller_id hijacking
-- ---------------------------------------------------------------------------

create or replace function public.set_product_seller_on_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.seller_id is null then
      new.seller_id := auth.uid();
    elsif new.seller_id is distinct from auth.uid() and not public.is_admin() then
      raise exception 'Cannot create products for another seller' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.seller_id is distinct from old.seller_id and not public.is_admin() then
      raise exception 'Cannot transfer product ownership' using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists products_set_seller on public.products;
create trigger products_set_seller
  before insert or update on public.products
  for each row
  execute function public.set_product_seller_on_write();

-- ---------------------------------------------------------------------------
-- Storage: sellers may upload only to folders for products they own
-- Path format: {product_id}/{filename}
-- ---------------------------------------------------------------------------

drop policy if exists "product_images_staff_upload" on storage.objects;
drop policy if exists "product_images_staff_update" on storage.objects;
drop policy if exists "product_images_staff_delete" on storage.objects;

create policy "product_images_seller_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1
      from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "product_images_seller_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1
      from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1
      from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "product_images_seller_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1
      from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and (p.seller_id = auth.uid() or public.is_admin())
    )
  );

-- Optional: assign orphaned products (seller_id null) to your admin account.
-- update public.products set seller_id = '<your-admin-profile-uuid>' where seller_id is null;
