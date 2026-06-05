-- Sellers (staff and admin) manage only their own products in the seller console.
-- Platform admins retain broader access on orders/feedback, not other sellers' catalogs.

drop policy if exists "products_select_admin" on public.products;

drop policy if exists "products_select_published" on public.products;
create policy "products_select_published"
  on public.products for select
  using (
    is_published = true
    and (
      not public.is_staff()
      or seller_id = auth.uid()
    )
  );

drop policy if exists "products_insert_seller" on public.products;
create policy "products_insert_seller"
  on public.products for insert
  with check (public.is_staff() and seller_id = auth.uid());

drop policy if exists "products_update_own_seller" on public.products;
create policy "products_update_own_seller"
  on public.products for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "products_delete_own_seller" on public.products;
create policy "products_delete_own_seller"
  on public.products for delete
  using (seller_id = auth.uid());

drop policy if exists "product_images_select" on public.product_images;
create policy "product_images_select"
  on public.product_images for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (
          (p.is_published = true and (not public.is_staff() or p.seller_id = auth.uid()))
          or p.seller_id = auth.uid()
        )
    )
  );

drop policy if exists "product_images_insert_own" on public.product_images;
create policy "product_images_insert_own"
  on public.product_images for insert
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );

drop policy if exists "products_images_update_own" on public.product_images;
drop policy if exists "product_images_update_own" on public.product_images;
create policy "product_images_update_own"
  on public.product_images for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );

drop policy if exists "product_images_delete_own" on public.product_images;
create policy "product_images_delete_own"
  on public.product_images for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = auth.uid()
    )
  );

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
    elsif new.seller_id is distinct from auth.uid() then
      raise exception 'Cannot create products for another seller' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'Cannot transfer product ownership' using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop policy if exists "product_images_seller_upload" on storage.objects;
drop policy if exists "product_images_seller_update" on storage.objects;
drop policy if exists "product_images_seller_delete" on storage.objects;

create policy "product_images_seller_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1 from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_seller_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1 from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.seller_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1 from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.seller_id = auth.uid()
    )
  );

create policy "product_images_seller_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.is_staff()
    and exists (
      select 1 from public.products p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.seller_id = auth.uid()
    )
  );
