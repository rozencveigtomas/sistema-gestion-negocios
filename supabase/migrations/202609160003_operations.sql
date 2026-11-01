-- Etapa 3: ventas, gastos, devoluciones y ofertas con operaciones atómicas.
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 2 and 120),
  scope text not null check (scope in ('product','category')),
  product_id uuid,
  category_id uuid,
  discount_type text not null check (discount_type in ('percent','fixed','price')),
  value numeric(14,2) not null check (value >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  description text check (char_length(description) <= 1000),
  priority integer not null default 0 check (priority between -1000 and 1000),
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id),
  check (ends_at > starts_at),
  check ((scope='product' and product_id is not null and category_id is null) or (scope='category' and category_id is not null and product_id is null)),
  foreign key (business_id,product_id) references public.products(business_id,id),
  foreign key (business_id,category_id) references public.categories(business_id,id),
  foreign key (business_id,created_by) references public.profiles(business_id,id)
);
create index offer_active_window on public.offers(business_id,active,starts_at,ends_at);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  idempotency_key uuid not null,
  seller_id uuid not null,
  status text not null default 'completed' check (status in ('completed','cancelled')),
  payment_method text not null check (payment_method in ('cash','debit','credit','transfer','other')),
  client_name text check (char_length(client_name) <= 150),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  total numeric(14,2) not null check (total >= 0),
  cost_total numeric(14,2) not null default 0 check (cost_total >= 0),
  notes text check (char_length(notes) <= 2000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(trim(cancellation_reason)) between 3 and 500),
  unique (business_id,id), unique (business_id,idempotency_key),
  foreign key (business_id,seller_id) references public.profiles(business_id,id)
);
create index sales_business_date on public.sales(business_id,occurred_at desc);
create index sales_seller_date on public.sales(business_id,seller_id,occurred_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  product_id uuid not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  final_unit_price numeric(14,2) not null check (final_unit_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  offer_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id,id), unique (sale_id,product_id),
  foreign key (business_id,sale_id) references public.sales(business_id,id),
  foreign key (business_id,product_id) references public.products(business_id,id),
  foreign key (business_id,offer_id) references public.offers(business_id,id)
);
create index sale_items_sale on public.sale_items(business_id,sale_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  concept text not null check (char_length(trim(concept)) between 2 and 160),
  category text not null check (char_length(trim(category)) between 2 and 80),
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash','debit','credit','transfer','other')),
  supplier_id uuid,
  receipt_reference text check (char_length(receipt_reference) <= 160),
  notes text check (char_length(notes) <= 2000),
  status text not null default 'paid' check (status in ('pending','paid','void')),
  occurred_at timestamptz not null default now(),
  created_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,supplier_id) references public.suppliers(business_id,id),
  foreign key (business_id,created_by) references public.profiles(business_id,id)
);
create index expenses_business_date on public.expenses(business_id,occurred_at desc);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  idempotency_key uuid not null,
  sale_id uuid not null,
  sale_item_id uuid not null,
  product_id uuid not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  refund_amount numeric(14,2) not null check (refund_amount >= 0),
  disposition text not null check (disposition in ('reenter','damaged','supplier','non_sellable','pending_review')),
  reason text not null check (char_length(trim(reason)) between 2 and 160),
  notes text check (char_length(notes) <= 2000),
  status text not null default 'completed' check (status in ('completed','cancelled')),
  created_by uuid not null,
  approved_by uuid,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (business_id,id), unique (business_id,idempotency_key),
  foreign key (business_id,sale_id) references public.sales(business_id,id),
  foreign key (business_id,sale_item_id) references public.sale_items(business_id,id),
  foreign key (business_id,product_id) references public.products(business_id,id),
  foreign key (business_id,created_by) references public.profiles(business_id,id),
  foreign key (business_id,approved_by) references public.profiles(business_id,id)
);
create index returns_business_date on public.returns(business_id,occurred_at desc);
create index returns_item on public.returns(business_id,sale_item_id);

alter table public.offers enable row level security; alter table public.sales enable row level security;
alter table public.sale_items enable row level security; alter table public.expenses enable row level security;
alter table public.returns enable row level security;
grant execute on function private.current_profile() to authenticated;

create policy offer_read on public.offers for select to authenticated using (
  business_id=(select private.business_id()) and ((active and starts_at<=now() and ends_at>now()) or (select private.is_boss()))
);
create policy sale_read on public.sales for select to authenticated using (
  business_id=(select private.business_id()) and ((select private.is_boss()) or seller_id=(select (private.current_profile()).id))
);
create policy sale_item_read on public.sale_items for select to authenticated using (
  business_id=(select private.business_id()) and exists(select 1 from public.sales s where s.business_id=sale_items.business_id and s.id=sale_items.sale_id and ((select private.is_boss()) or s.seller_id=(select (private.current_profile()).id)))
);
create policy expense_boss_read on public.expenses for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
create policy return_read on public.returns for select to authenticated using (
  business_id=(select private.business_id()) and ((select private.is_boss()) or created_by=(select (private.current_profile()).id))
);

revoke all on public.offers,public.sales,public.sale_items,public.expenses,public.returns from anon,authenticated;
grant select on public.offers to authenticated;
grant select on public.sales,public.sale_items,public.returns to authenticated;
grant select on public.expenses to authenticated;

create function public.create_offer(
  p_name text,p_scope text,p_product_id uuid,p_category_id uuid,p_discount_type text,p_value numeric,
  p_starts_at timestamptz,p_ends_at timestamptz,p_description text,p_priority integer default 0
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.profiles; offer_id uuid;
begin
  actor:=private.require_profile(true);
  if p_scope not in ('product','category') or p_discount_type not in ('percent','fixed','price') or p_value is null or p_value<0 or p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at then raise exception 'Oferta inválida' using errcode='22023'; end if;
  if p_scope='product' and (p_product_id is null or p_category_id is not null) then raise exception 'Producto de oferta inválido' using errcode='22023'; end if;
  if p_scope='category' and (p_category_id is null or p_product_id is not null) then raise exception 'Categoría de oferta inválida' using errcode='22023'; end if;
  if p_discount_type='percent' and p_value>100 then raise exception 'El porcentaje no puede superar 100' using errcode='22023'; end if;
  insert into public.offers(business_id,name,scope,product_id,category_id,discount_type,value,starts_at,ends_at,description,priority,created_by)
  values(actor.business_id,trim(p_name),p_scope,p_product_id,p_category_id,p_discount_type,p_value,p_starts_at,p_ends_at,nullif(trim(p_description),''),coalesce(p_priority,0),actor.id) returning id into offer_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'offer.created','offers',offer_id,jsonb_build_object('name',trim(p_name),'scope',p_scope));
  return offer_id;
end;$$;

create function public.set_offer_active(p_offer_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; old_offer public.offers;
begin
  actor:=private.require_profile(true); select * into old_offer from public.offers where id=p_offer_id and business_id=actor.business_id for update;
  if old_offer.id is null or p_active is null then raise exception 'Oferta no disponible' using errcode='42501'; end if;
  update public.offers set active=p_active,updated_at=now() where id=old_offer.id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,previous_values,new_values) values(actor.business_id,actor.id,case when p_active then 'offer.reactivated' else 'offer.archived' end,'offers',old_offer.id,jsonb_build_object('active',old_offer.active),jsonb_build_object('active',p_active));
end;$$;

create function public.create_sale(
  p_idempotency_key uuid,p_items jsonb,p_payment_method text,p_client_name text default null,p_notes text default null,p_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor public.profiles; sale_id uuid; item jsonb; product public.products; line public.sale_items;
  item_product uuid; item_quantity numeric; sale_time timestamptz:=coalesce(p_occurred_at,now());
  v_subtotal numeric:=0; v_discount_total numeric:=0; v_total numeric:=0; v_cost_total numeric:=0;
  unit_cost numeric; discount_each numeric; final_price numeric; resulting numeric;
  offer_id uuid; sale_offer_type text; sale_offer_value numeric;
begin
  actor:=private.require_profile();
  if p_idempotency_key is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Venta inválida' using errcode='22023'; end if;
  if p_payment_method not in ('cash','debit','credit','transfer','other') then raise exception 'Medio de pago inválido' using errcode='22023'; end if;
  if sale_time>now()+interval '5 minutes' or sale_time<now()-interval '30 days' then raise exception 'Fecha de venta inválida' using errcode='22023'; end if;
  select id into sale_id from public.sales where business_id=actor.business_id and idempotency_key=p_idempotency_key;
  if sale_id is not null then return sale_id; end if;
  if exists(select 1 from (select value->>'product_id' product_key,count(*) n from jsonb_array_elements(p_items) group by value->>'product_id') repeated where repeated.n>1) then raise exception 'No repitas un producto en la venta' using errcode='22023'; end if;
  insert into public.sales(business_id,idempotency_key,seller_id,payment_method,client_name,subtotal,discount_total,total,cost_total,notes,occurred_at)
  values(actor.business_id,p_idempotency_key,actor.id,p_payment_method,nullif(trim(p_client_name),''),0,0,0,0,nullif(trim(p_notes),''),sale_time)
  on conflict (business_id,idempotency_key) do nothing returning id into sale_id;
  if sale_id is null then select id into sale_id from public.sales where business_id=actor.business_id and idempotency_key=p_idempotency_key; if sale_id is null then raise exception 'No se pudo reservar la venta' using errcode='40001'; else return sale_id; end if; end if;
  for item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    item_product:=(item->>'product_id')::uuid; item_quantity:=(item->>'quantity')::numeric;
    if item_quantity is null or item_quantity<=0 or item_quantity>999999999 then raise exception 'Cantidad de venta inválida' using errcode='22023'; end if;
    select * into product from public.products where id=item_product and business_id=actor.business_id and active for update;
    if product.id is null then raise exception 'Producto no disponible' using errcode='42501'; end if;
    if product.current_stock<item_quantity then raise exception 'Stock insuficiente para la venta' using errcode='22023'; end if;
    select o.id,o.discount_type,o.value,
      greatest(0,case when o.discount_type='percent' then product.sale_price*least(o.value,100)/100 when o.discount_type='fixed' then o.value when o.discount_type='price' then product.sale_price-o.value else 0 end)
    into offer_id,sale_offer_type,sale_offer_value,discount_each
    from public.offers o where o.business_id=actor.business_id and o.active and o.starts_at<=sale_time and o.ends_at>sale_time and ((o.scope='product' and o.product_id=product.id) or (o.scope='category' and o.category_id=product.category_id))
    order by greatest(0,case when o.discount_type='percent' then product.sale_price*least(o.value,100)/100 when o.discount_type='fixed' then o.value when o.discount_type='price' then product.sale_price-o.value else 0 end) desc,o.priority desc,o.created_at asc limit 1;
    discount_each:=coalesce(discount_each,0); final_price:=greatest(0,product.sale_price-discount_each);
    select coalesce(cost_price,0) into unit_cost from public.product_financials where product_id=product.id and business_id=actor.business_id;
    unit_cost:=coalesce(unit_cost,0); v_subtotal:=v_subtotal+product.sale_price*item_quantity; v_discount_total:=v_discount_total+discount_each*item_quantity; v_total:=v_total+final_price*item_quantity; v_cost_total:=v_cost_total+unit_cost*item_quantity;
    insert into public.sale_items(business_id,sale_id,product_id,quantity,unit_price,discount_amount,final_unit_price,unit_cost,offer_id) values(actor.business_id,sale_id,product.id,item_quantity,product.sale_price,discount_each,final_price,unit_cost,offer_id);
    resulting:=product.current_stock-item_quantity; update public.products set current_stock=resulting,updated_at=now() where id=product.id;
    insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,reference_type,reference_id,notes,performed_by,occurred_at) values(actor.business_id,product.id,'exit',item_quantity,product.current_stock,resulting,'sale','sale',sale_id,'Venta',actor.id,sale_time);
    insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'stock.exit','products',product.id,jsonb_build_object('quantity',item_quantity,'previous',product.current_stock,'resulting',resulting,'reason','sale','sale_id',sale_id));
  end loop;
  update public.sales s set subtotal=v_subtotal,discount_total=v_discount_total,total=v_total,cost_total=v_cost_total where s.id=sale_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'sale.created','sales',sale_id,jsonb_build_object('subtotal',v_subtotal,'discount',v_discount_total,'total',v_total,'cost',v_cost_total));
  return sale_id;
end;$$;

create function public.cancel_sale(p_sale_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; sale public.sales; item public.sale_items; product public.products; resulting numeric;
begin
  actor:=private.require_profile(true); select * into sale from public.sales where id=p_sale_id and business_id=actor.business_id for update;
  if sale.id is null or sale.status<>'completed' or p_reason is null or char_length(trim(p_reason))<3 then raise exception 'Venta no disponible para cancelar' using errcode='22023'; end if;
  for item in select * from public.sale_items where sale_id=sale.id and business_id=actor.business_id order by product_id loop
    select * into product from public.products where id=item.product_id and business_id=actor.business_id for update;
    if product.id is null then raise exception 'Producto de la venta no disponible' using errcode='42501'; end if;
    resulting:=product.current_stock+item.quantity; update public.products set current_stock=resulting,updated_at=now() where id=product.id;
    insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,reference_type,reference_id,notes,performed_by,approved_by) values(actor.business_id,product.id,'entry',item.quantity,product.current_stock,resulting,'correction','sale_cancellation',sale.id,'Cancelación: '||trim(p_reason),actor.id,actor.id);
  end loop;
  update public.sales set status='cancelled',cancelled_at=now(),cancellation_reason=trim(p_reason) where id=sale.id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'sale.cancelled','sales',sale.id,jsonb_build_object('reason',trim(p_reason))); 
end;$$;

create function public.create_expense(
  p_concept text,p_category text,p_amount numeric,p_payment_method text,p_supplier_id uuid,p_receipt_reference text,p_notes text,p_status text default 'paid',p_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.profiles; expense_id uuid; expense_time timestamptz:=coalesce(p_occurred_at,now());
begin
  actor:=private.require_profile(true);
  if p_amount is null or p_amount<=0 or p_payment_method not in ('cash','debit','credit','transfer','other') or p_status not in ('pending','paid','void') or expense_time>now()+interval '5 minutes' or expense_time<now()-interval '1 year' then raise exception 'Gasto inválido' using errcode='22023'; end if;
  insert into public.expenses(business_id,concept,category,amount,payment_method,supplier_id,receipt_reference,notes,status,occurred_at,created_by) values(actor.business_id,trim(p_concept),trim(p_category),p_amount,p_payment_method,p_supplier_id,nullif(trim(p_receipt_reference),''),nullif(trim(p_notes),''),p_status,expense_time,actor.id) returning id into expense_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'expense.created','expenses',expense_id,jsonb_build_object('amount',p_amount,'status',p_status));
  return expense_id;
end;$$;

create function public.set_expense_status(p_expense_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; old_status text;
begin
  actor:=private.require_profile(true); if p_status not in ('pending','paid','void') then raise exception 'Estado de gasto inválido' using errcode='22023'; end if;
  select status into old_status from public.expenses where id=p_expense_id and business_id=actor.business_id for update;
  if old_status is null then raise exception 'Gasto no disponible' using errcode='42501'; end if;
  update public.expenses set status=p_status,updated_at=now() where id=p_expense_id;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,previous_values,new_values) values(actor.business_id,actor.id,'expense.updated','expenses',p_expense_id,jsonb_build_object('status',old_status),jsonb_build_object('status',p_status));
end;$$;

create function public.create_return(
  p_idempotency_key uuid,p_sale_item_id uuid,p_quantity numeric,p_disposition text,p_refund_amount numeric,p_reason text,p_notes text default null,p_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.profiles; return_id uuid; line public.sale_items; sale public.sales; product public.products; already numeric; remaining numeric; resulting numeric; return_time timestamptz:=coalesce(p_occurred_at,now());
begin
  actor:=private.require_profile();
  if p_idempotency_key is null or p_quantity is null or p_quantity<=0 or p_disposition not in ('reenter','damaged','supplier','non_sellable','pending_review') or p_refund_amount is null or p_refund_amount<0 or p_reason is null or char_length(trim(p_reason))<2 then raise exception 'Devolución inválida' using errcode='22023'; end if;
  if actor.role<>'boss' and p_disposition in ('damaged','supplier','non_sellable') then raise exception 'Esta disposición requiere aprobación del jefe' using errcode='42501'; end if;
  if return_time>now()+interval '5 minutes' or return_time<now()-interval '1 year' then raise exception 'Fecha de devolución inválida' using errcode='22023'; end if;
  select id into return_id from public.returns where business_id=actor.business_id and idempotency_key=p_idempotency_key; if return_id is not null then return return_id; end if;
  select si.* into line from public.sale_items si where si.id=p_sale_item_id and si.business_id=actor.business_id for update;
  if line.id is null then raise exception 'Artículo vendido no disponible' using errcode='42501'; end if;
  select * into sale from public.sales where id=line.sale_id and business_id=actor.business_id for update;
  if sale.id is null or sale.status<>'completed' then raise exception 'La venta no permite devoluciones' using errcode='22023'; end if;
  select coalesce(sum(quantity),0) into already from public.returns where sale_item_id=line.id and business_id=actor.business_id and status='completed';
  remaining:=line.quantity-already; if p_quantity>remaining then raise exception 'La cantidad supera lo vendido disponible para devolver' using errcode='22023'; end if;
  if p_refund_amount>line.final_unit_price*p_quantity then raise exception 'El reintegro supera el importe cobrado' using errcode='22023'; end if;
  select * into product from public.products where id=line.product_id and business_id=actor.business_id for update;
  if product.id is null then raise exception 'Producto no disponible' using errcode='42501'; end if;
  if p_disposition='reenter' and not product.active then raise exception 'Reactivá el producto antes de reingresarlo' using errcode='22023'; end if;
  insert into public.returns(business_id,idempotency_key,sale_id,sale_item_id,product_id,quantity,unit_price,refund_amount,disposition,reason,notes,created_by,approved_by,occurred_at) values(actor.business_id,p_idempotency_key,sale.id,line.id,product.id,p_quantity,line.final_unit_price,p_refund_amount,p_disposition,trim(p_reason),nullif(trim(p_notes),''),actor.id,case when actor.role='boss' then actor.id end,return_time) returning id into return_id;
  if p_disposition='reenter' then
    resulting:=product.current_stock+p_quantity; update public.products set current_stock=resulting,updated_at=now() where id=product.id;
    insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,reference_type,reference_id,notes,performed_by,approved_by,occurred_at) values(actor.business_id,product.id,'entry',p_quantity,product.current_stock,resulting,'return','return',return_id,'Devolución: '||trim(p_reason),actor.id,case when actor.role='boss' then actor.id end,return_time);
  end if;
  insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'return.created','returns',return_id,jsonb_build_object('quantity',p_quantity,'refund',p_refund_amount,'disposition',p_disposition,'sale_id',sale.id));
  return return_id;
end;$$;

revoke all on function public.create_offer(text,text,uuid,uuid,text,numeric,timestamptz,timestamptz,text,integer),public.set_offer_active(uuid,boolean),public.create_sale(uuid,jsonb,text,text,text,timestamptz),public.cancel_sale(uuid,text),public.create_expense(text,text,numeric,text,uuid,text,text,text,timestamptz),public.set_expense_status(uuid,text),public.create_return(uuid,uuid,numeric,text,numeric,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_offer(text,text,uuid,uuid,text,numeric,timestamptz,timestamptz,text,integer),public.set_offer_active(uuid,boolean),public.create_sale(uuid,jsonb,text,text,text,timestamptz),public.cancel_sale(uuid,text),public.create_expense(text,text,numeric,text,uuid,text,text,text,timestamptz),public.set_expense_status(uuid,text),public.create_return(uuid,uuid,numeric,text,numeric,text,text,timestamptz) to authenticated;
