-- Etapa 7: RLS limita filas, pero no oculta columnas financieras de la fila propia.
-- Los costos solo se devuelven por reportes de jefe y funciones autorizadas.
revoke select on public.sales,public.sale_items from authenticated;
grant select (
  id,business_id,idempotency_key,seller_id,status,payment_method,client_name,
  subtotal,discount_total,total,notes,occurred_at,created_at,cancelled_at,cancellation_reason
) on public.sales to authenticated;
grant select (
  id,business_id,sale_id,product_id,quantity,unit_price,discount_amount,
  final_unit_price,offer_id,created_at
) on public.sale_items to authenticated;

create or replace view public.boss_sales_financials as
select id,business_id,seller_id,status,total,cost_total,occurred_at
from public.sales
where business_id=(select private.business_id()) and (select private.is_boss());
revoke all on public.boss_sales_financials from public,anon;
grant select on public.boss_sales_financials to authenticated;
