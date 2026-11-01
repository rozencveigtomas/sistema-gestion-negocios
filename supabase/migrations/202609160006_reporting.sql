-- Etapa 5: métricas determinísticas y fotografía diaria para reportes gerenciales.
create table public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  summary_date date not null,
  gross_income numeric(14,2) not null default 0 check (gross_income >= 0),
  net_sales numeric(14,2) not null default 0 check (net_sales >= 0),
  cost_of_goods numeric(14,2) not null default 0 check (cost_of_goods >= 0),
  expenses numeric(14,2) not null default 0 check (expenses >= 0),
  refunds numeric(14,2) not null default 0 check (refunds >= 0),
  estimated_profit numeric(14,2) not null default 0,
  sales_count integer not null default 0 check (sales_count >= 0),
  units_sold numeric(14,3) not null default 0 check (units_sold >= 0),
  average_ticket numeric(14,2) not null default 0 check (average_ticket >= 0),
  top_product_id uuid,
  top_category_id uuid,
  top_seller_id uuid,
  returns_count integer not null default 0 check (returns_count >= 0),
  generated_at timestamptz not null default now(),
  unique (business_id,summary_date),
  unique (business_id,id),
  foreign key (business_id,top_product_id) references public.products(business_id,id),
  foreign key (business_id,top_category_id) references public.categories(business_id,id),
  foreign key (business_id,top_seller_id) references public.profiles(business_id,id)
);
create index daily_summaries_business_date on public.daily_summaries(business_id,summary_date desc);
alter table public.daily_summaries enable row level security;
create policy daily_summary_read on public.daily_summaries for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
revoke all on public.daily_summaries from anon,authenticated;
grant select on public.daily_summaries to authenticated;

create function public.generate_daily_summary(p_summary_date date) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  actor public.profiles; summary_id uuid; day_start timestamptz; day_end timestamptz;
  gross numeric:=0; net numeric:=0; costs numeric:=0; expense_total numeric:=0; refund_total numeric:=0; profit numeric:=0;
  sale_total integer:=0; units numeric:=0; ticket numeric:=0; return_total integer:=0;
  top_product uuid; top_category uuid; top_seller uuid;
begin
  actor:=private.require_profile(true);
  if p_summary_date is null or p_summary_date > ((now() at time zone 'America/Argentina/Buenos_Aires')::date) then raise exception 'La fecha del análisis no puede ser futura' using errcode='22023'; end if;
  day_start:=p_summary_date::timestamp at time zone 'America/Argentina/Buenos_Aires'; day_end:=(p_summary_date+1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
  select coalesce(sum(subtotal),0),coalesce(sum(total),0),coalesce(sum(cost_total),0),count(*)::integer into gross,net,costs,sale_total from public.sales where business_id=actor.business_id and status='completed' and occurred_at>=day_start and occurred_at<day_end;
  select coalesce(sum(amount),0) into expense_total from public.expenses where business_id=actor.business_id and status<>'void' and occurred_at>=day_start and occurred_at<day_end;
  select coalesce(sum(refund_amount),0),count(*)::integer into refund_total,return_total from public.returns where business_id=actor.business_id and status='completed' and occurred_at>=day_start and occurred_at<day_end;
  select coalesce(sum(si.quantity),0) into units from public.sale_items si join public.sales s on s.business_id=si.business_id and s.id=si.sale_id where si.business_id=actor.business_id and s.status='completed' and s.occurred_at>=day_start and s.occurred_at<day_end;
  if sale_total>0 then ticket:=net/sale_total; end if;
  profit:=net-costs-expense_total-refund_total;
  select si.product_id into top_product from public.sale_items si join public.sales s on s.business_id=si.business_id and s.id=si.sale_id where si.business_id=actor.business_id and s.status='completed' and s.occurred_at>=day_start and s.occurred_at<day_end group by si.product_id order by sum(si.quantity) desc,si.product_id limit 1;
  select p.category_id into top_category from public.sale_items si join public.sales s on s.business_id=si.business_id and s.id=si.sale_id join public.products p on p.business_id=si.business_id and p.id=si.product_id where si.business_id=actor.business_id and s.status='completed' and s.occurred_at>=day_start and s.occurred_at<day_end group by p.category_id order by sum(si.quantity) desc,p.category_id limit 1;
  select s.seller_id into top_seller from public.sales s where s.business_id=actor.business_id and s.status='completed' and s.occurred_at>=day_start and s.occurred_at<day_end group by s.seller_id order by sum(s.total) desc,s.seller_id limit 1;
  insert into public.daily_summaries(business_id,summary_date,gross_income,net_sales,cost_of_goods,expenses,refunds,estimated_profit,sales_count,units_sold,average_ticket,top_product_id,top_category_id,top_seller_id,returns_count,generated_at)
  values(actor.business_id,p_summary_date,gross,net,costs,expense_total,refund_total,profit,sale_total,units,ticket,top_product,top_category,top_seller,return_total,now())
  on conflict (business_id,summary_date) do update set gross_income=excluded.gross_income,net_sales=excluded.net_sales,cost_of_goods=excluded.cost_of_goods,expenses=excluded.expenses,refunds=excluded.refunds,estimated_profit=excluded.estimated_profit,sales_count=excluded.sales_count,units_sold=excluded.units_sold,average_ticket=excluded.average_ticket,top_product_id=excluded.top_product_id,top_category_id=excluded.top_category_id,top_seller_id=excluded.top_seller_id,returns_count=excluded.returns_count,generated_at=excluded.generated_at
  returning id into summary_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'analysis.generated','daily_summaries',summary_id,jsonb_build_object('summary_date',p_summary_date));
  return summary_id;
end;$$;
revoke all on function public.generate_daily_summary(date) from public,anon,authenticated;
grant execute on function public.generate_daily_summary(date) to authenticated;
