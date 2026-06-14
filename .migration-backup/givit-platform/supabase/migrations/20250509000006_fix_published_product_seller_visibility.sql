-- Staff were seeing every published product because products_select_published had no seller check.
-- Buyers (customers) still see all published listings; sellers only see their own (+ admins see all).

drop policy if exists "products_select_published" on public.products;

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

drop policy if exists "product_images_select" on public.product_images;

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
