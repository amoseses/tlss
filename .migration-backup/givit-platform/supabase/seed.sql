-- Optional demo data (run in SQL editor or `psql` after migrations)

insert into public.categories (slug, name, sort_order)
values
  ('food-beverage', 'Food & Beverage', 1),
  ('packaging', 'Packaging & Supplies', 2),
  ('electronics', 'Electronics & Accessories', 3),
  ('office', 'Office & Operations', 4)
on conflict (slug) do nothing;

insert into public.products (
  slug, name, description, sku, price_cents, weight_oz, min_order_qty, stock, is_published, category_id
)
select
  p.slug,
  p.name,
  p.description,
  p.sku,
  p.price_cents,
  p.weight_oz,
  p.min_order_qty,
  p.stock,
  true,
  c.id
from (
  values
    ('organic-honey-5kg', 'Organic Honey — 5kg tub', 'Single-origin bulk honey for retail or café use.', 'HM-HON-5K', 4599, 176.0, 4, 120, 'food-beverage'),
    ('kraft-mailers-100', 'Recycled Kraft Mailers (100 pack)', '100% recycled padded mailers; wholesale carton.', 'HM-MAIL-100', 8900, 80.0, 2, 45, 'packaging'),
    ('usb-c-hub-12', 'USB-C Hub — 12-in-1 Aluminum', 'HDMI, card readers, ethernet; case quantity.', 'HM-HUB-12', 3299, 12.0, 10, 200, 'electronics'),
    ('thermal-label-rolls', 'Thermal Label Rolls 4x6 (8 rolls)', 'BPA-free; compatible with major printers.', 'HM-LBL-4X6', 14900, 48.0, 5, 60, 'office')
) as p(slug, name, description, sku, price_cents, weight_oz, min_order_qty, stock, category_slug)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;
