-- Aggregated sales for storefront ranking (public read, no order detail exposure).

create or replace view public.product_sales_stats
with (security_invoker = false) as
select
  oi.product_id,
  coalesce(sum(oi.quantity), 0)::int as units_sold,
  count(distinct oi.order_id)::int as order_count
from public.order_items oi
inner join public.orders o on o.id = oi.order_id
where o.status <> 'cancelled'
group by oi.product_id;

grant select on public.product_sales_stats to anon, authenticated;
