-- Etapa 2: catálogo y stock derivados exclusivamente de movimientos atómicos.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create unique index category_name_per_business on public.categories(business_id,lower(name));

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create unique index location_name_per_business on public.locations(business_id,lower(name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 2 and 100),
  contact_information text check (char_length(contact_information) <= 1000),
  notes text check (char_length(notes) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create unique index supplier_name_per_business on public.suppliers(business_id,lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  internal_identifier text not null check (char_length(trim(internal_identifier)) between 1 and 80),
  barcode text check (barcode is null or char_length(trim(barcode)) between 3 and 80),
  name text not null check (char_length(trim(name)) between 2 and 150),
  description text check (char_length(description) <= 2000), brand text check (char_length(brand) <= 100),
  category_id uuid not null, supplier_id uuid, color text check (char_length(color) <= 80),
  size text check (char_length(size) <= 80), model text check (char_length(model) <= 100),
  variant text check (char_length(variant) <= 120),
  unit_of_measure text not null check (unit_of_measure in ('unidad','kg','g','l','ml','m','cm','caja','paquete')),
  sale_price numeric(14,2) not null check (sale_price >= 0),
  current_stock numeric(14,3) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  ideal_stock numeric(14,3) check (ideal_stock is null or ideal_stock >= minimum_stock),
  location_id uuid not null, expiration_date date, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,category_id) references public.categories(business_id,id),
  foreign key (business_id,location_id) references public.locations(business_id,id),
  foreign key (business_id,supplier_id) references public.suppliers(business_id,id)
);
create unique index product_sku_per_business on public.products(business_id,lower(internal_identifier));
create unique index product_barcode_per_business on public.products(business_id,barcode) where barcode is not null;
create index product_catalog_search on public.products(business_id,active,name);
create index product_low_stock on public.products(business_id,current_stock,minimum_stock) where active;

-- Los costos y notas internas están separados para que RLS no dependa de ocultar columnas.
create table public.product_financials (
  product_id uuid primary key,
  business_id uuid not null,
  cost_price numeric(14,2) not null check (cost_price >= 0),
  internal_notes text check (char_length(internal_notes) <= 3000),
  updated_at timestamptz not null default now(),
  foreign key (business_id,product_id) references public.products(business_id,id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id), product_id uuid not null,
  movement_type text not null check (movement_type in ('entry','exit')),
  quantity numeric(14,3) not null check (quantity > 0),
  previous_stock numeric(14,3) not null check (previous_stock >= 0),
  resulting_stock numeric(14,3) not null check (resulting_stock >= 0),
  reason text not null check (reason in ('initial','purchase','return','sale','damage','loss','internal_use','transfer','correction','other')),
  reference_type text check (char_length(reference_type) <= 40), reference_id uuid,
  notes text check (char_length(notes) <= 2000),
  performed_by uuid not null, approved_by uuid,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now(),
  foreign key (business_id,product_id) references public.products(business_id,id),
  foreign key (business_id,performed_by) references public.profiles(business_id,id),
  foreign key (business_id,approved_by) references public.profiles(business_id,id)
);
create index movement_product_date on public.inventory_movements(business_id,product_id,occurred_at desc);

alter table public.categories enable row level security; alter table public.locations enable row level security;
alter table public.suppliers enable row level security; alter table public.products enable row level security;
alter table public.product_financials enable row level security; alter table public.inventory_movements enable row level security;

create policy category_read on public.categories for select to authenticated using (business_id=(select private.business_id()) and (active or (select private.is_boss())));
create policy location_read on public.locations for select to authenticated using (business_id=(select private.business_id()) and (active or (select private.is_boss())));
create policy supplier_boss_read on public.suppliers for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
create policy product_read on public.products for select to authenticated using (business_id=(select private.business_id()) and (active or (select private.is_boss())));
create policy financial_boss_read on public.product_financials for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
create policy movement_read on public.inventory_movements for select to authenticated using (business_id=(select private.business_id()));

revoke all on public.categories,public.locations,public.suppliers,public.products,public.product_financials,public.inventory_movements from anon,authenticated;
grant select on public.categories,public.locations,public.products,public.inventory_movements to authenticated;
grant select on public.suppliers,public.product_financials to authenticated;

create function public.create_catalog_item(p_kind text,p_name text,p_description text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; new_id uuid;
begin
 actor:=private.require_profile(true);
 if p_kind='category' then insert into public.categories(business_id,name,description) values(actor.business_id,trim(p_name),nullif(trim(p_description),'')) returning id into new_id;
 elsif p_kind='location' then insert into public.locations(business_id,name,description) values(actor.business_id,trim(p_name),nullif(trim(p_description),'')) returning id into new_id;
 elsif p_kind='supplier' then insert into public.suppliers(business_id,name,notes) values(actor.business_id,trim(p_name),nullif(trim(p_description),'')) returning id into new_id;
 else raise exception 'Tipo de catálogo inválido' using errcode='22023'; end if;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,p_kind||'.created',p_kind,new_id,jsonb_build_object('name',trim(p_name)));
 return new_id;
end;$$;

create function public.create_product(
 p_internal_identifier text,p_barcode text,p_name text,p_description text,p_brand text,p_category_id uuid,p_supplier_id uuid,
 p_color text,p_size text,p_model text,p_variant text,p_unit_of_measure text,p_cost_price numeric,p_sale_price numeric,
 p_initial_stock numeric,p_minimum_stock numeric,p_ideal_stock numeric,p_location_id uuid,p_expiration_date date,p_internal_notes text
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.profiles; product_id uuid;
begin
 actor:=private.require_profile(true);
 if p_initial_stock is null or p_initial_stock<0 then raise exception 'Stock inicial inválido' using errcode='22023'; end if;
 insert into public.products(business_id,internal_identifier,barcode,name,description,brand,category_id,supplier_id,color,size,model,variant,unit_of_measure,sale_price,current_stock,minimum_stock,ideal_stock,location_id,expiration_date)
 values(actor.business_id,trim(p_internal_identifier),nullif(trim(p_barcode),''),trim(p_name),nullif(trim(p_description),''),nullif(trim(p_brand),''),p_category_id,p_supplier_id,nullif(trim(p_color),''),nullif(trim(p_size),''),nullif(trim(p_model),''),nullif(trim(p_variant),''),p_unit_of_measure,p_sale_price,p_initial_stock,p_minimum_stock,p_ideal_stock,p_location_id,p_expiration_date) returning id into product_id;
 insert into public.product_financials(product_id,business_id,cost_price,internal_notes) values(product_id,actor.business_id,p_cost_price,nullif(trim(p_internal_notes),''));
 if p_initial_stock>0 then insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,notes,performed_by,approved_by) values(actor.business_id,product_id,'entry',p_initial_stock,0,p_initial_stock,'initial','Stock inicial',actor.id,actor.id); end if;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'product.created','products',product_id,jsonb_build_object('sku',trim(p_internal_identifier),'stock',p_initial_stock));
 return product_id;
end;$$;

create function public.adjust_stock(p_product_id uuid,p_movement_type text,p_quantity numeric,p_reason text,p_notes text,p_occurred_at timestamptz default now()) returns numeric
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; product public.products; result numeric; approver uuid;
begin
 actor:=private.require_profile();
 if p_movement_type not in ('entry','exit') or p_quantity is null or p_quantity<=0 then raise exception 'Movimiento inválido' using errcode='22023'; end if;
 if p_reason not in ('purchase','return','sale','damage','loss','internal_use','transfer','correction','other') then raise exception 'Motivo inválido' using errcode='22023'; end if;
 if (p_movement_type='entry' and p_reason not in ('purchase','return','transfer','correction','other')) or (p_movement_type='exit' and p_reason not in ('sale','damage','loss','internal_use','transfer','correction','other')) then raise exception 'Motivo incompatible con el tipo de movimiento' using errcode='22023'; end if;
 if actor.role<>'boss' and p_reason in ('loss','correction','other') then raise exception 'Requiere aprobación del jefe' using errcode='42501'; end if;
 select * into product from public.products where id=p_product_id and business_id=actor.business_id and active for update;
 if product.id is null then raise exception 'Producto no disponible' using errcode='42501'; end if;
 result:=product.current_stock + case when p_movement_type='entry' then p_quantity else -p_quantity end;
 if result<0 then raise exception 'Stock insuficiente' using errcode='22023'; end if;
 if actor.role='boss' and p_reason in ('loss','correction','other') then approver:=actor.id; end if;
 update public.products set current_stock=result,updated_at=now() where id=product.id;
 insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,notes,performed_by,approved_by,occurred_at)
 values(actor.business_id,product.id,p_movement_type,p_quantity,product.current_stock,result,p_reason,nullif(trim(p_notes),''),actor.id,approver,coalesce(p_occurred_at,now()));
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'stock.'||p_movement_type,'products',product.id,jsonb_build_object('quantity',p_quantity,'previous',product.current_stock,'resulting',result,'reason',p_reason));
 return result;
end;$$;

create function public.set_product_active(p_product_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; product public.products;
begin
 actor:=private.require_profile(true); select * into product from public.products where id=p_product_id and business_id=actor.business_id for update;
 if product.id is null or p_active is null then raise exception 'Producto no disponible' using errcode='42501'; end if;
 update public.products set active=p_active,updated_at=now() where id=product.id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,previous_values,new_values) values(actor.business_id,actor.id,case when p_active then 'product.reactivated' else 'product.archived' end,'products',product.id,jsonb_build_object('active',product.active),jsonb_build_object('active',p_active));
end;$$;

revoke all on function public.create_catalog_item(text,text,text),public.create_product(text,text,text,text,text,uuid,uuid,text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,uuid,date,text),public.adjust_stock(uuid,text,numeric,text,text,timestamptz),public.set_product_active(uuid,boolean) from public,anon,authenticated;
grant execute on function public.create_catalog_item(text,text,text),public.create_product(text,text,text,text,text,uuid,uuid,text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,uuid,date,text),public.set_product_active(uuid,boolean) to authenticated;
grant execute on function public.adjust_stock(uuid,text,numeric,text,text,timestamptz) to authenticated;
