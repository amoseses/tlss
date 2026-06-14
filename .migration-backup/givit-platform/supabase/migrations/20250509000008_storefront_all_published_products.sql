-- Storefront catalog: every user (buyers, sellers, admins) sees all published products.
-- Seller console still scopes writes and draft visibility via products_select_own_seller.

drop policy if exists "products_select_published" on public.products;

create policy "products_select_published"
  on public.products for select
  using (is_published = true);

drop policy if exists "product_images_select" on public.product_images;

create policy "product_images_select"
  on public.product_images for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (p.is_published = true or p.seller_id = auth.uid())
    )
  );
