-- Etapa 4: conteos físicos como fotografía y aprobación explícita.
create table public.inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  name text not null check (char_length(trim(name)) between 2 and 120),
  sector text check (sector is null or char_length(trim(sector)) <= 120),
  location_id uuid,
  status text not null default 'preparation' check (status in ('preparation','in_progress','recount','pending_approval','completed','cancelled')),
  pause_sales boolean not null default false,
  started_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null,
  count_manager uuid,
  recorder uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,location_id) references public.locations(business_id,id),
  foreign key (business_id,created_by) references public.profiles(business_id,id),
  foreign key (business_id,count_manager) references public.profiles(business_id,id),
  foreign key (business_id,recorder) references public.profiles(business_id,id)
);
create index inventory_session_status on public.inventory_sessions(business_id,status,created_at desc);

create table public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  session_id uuid not null,
  product_id uuid not null,
  expected_stock numeric(14,3) not null check (expected_stock >= 0),
  first_count numeric(14,3) check (first_count is null or first_count >= 0),
  second_count numeric(14,3) check (second_count is null or second_count >= 0),
  final_count numeric(14,3) check (final_count is null or final_count >= 0),
  difference numeric(14,3) check (difference is null or difference between -999999999 and 999999999),
  notes text check (char_length(notes) <= 2000),
  counted_by uuid, recorded_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (session_id,product_id),
  foreign key (business_id,session_id) references public.inventory_sessions(business_id,id),
  foreign key (business_id,product_id) references public.products(business_id,id),
  foreign key (business_id,counted_by) references public.profiles(business_id,id),
  foreign key (business_id,recorded_by) references public.profiles(business_id,id)
);
create index inventory_count_session on public.inventory_count_items(business_id,session_id);

alter table public.inventory_sessions enable row level security; alter table public.inventory_count_items enable row level security;
create policy inventory_session_read on public.inventory_sessions for select to authenticated using (business_id=(select private.business_id()));
create policy inventory_count_read on public.inventory_count_items for select to authenticated using (business_id=(select private.business_id()));
revoke all on public.inventory_sessions,public.inventory_count_items from anon,authenticated;
grant select on public.inventory_sessions,public.inventory_count_items to authenticated;

create function public.create_inventory_session(p_name text,p_sector text,p_location_id uuid,p_pause_sales boolean,p_product_ids jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; session_id uuid; product_id uuid; product public.products; selected_count integer:=0;
begin
 actor:=private.require_profile(true);
 if jsonb_typeof(p_product_ids)<>'array' or jsonb_array_length(p_product_ids)<1 or jsonb_array_length(p_product_ids)>100 then raise exception 'Elegí entre 1 y 100 referencias' using errcode='22023'; end if;
 insert into public.inventory_sessions(business_id,name,sector,location_id,pause_sales,created_by,count_manager,recorder) values(actor.business_id,trim(p_name),nullif(trim(p_sector),''),p_location_id,coalesce(p_pause_sales,false),actor.id,actor.id,actor.id) returning id into session_id;
 for product_id in select value #>> '{}' from jsonb_array_elements(p_product_ids) loop
   selected_count:=selected_count+1; select * into product from public.products where id=product_id and business_id=actor.business_id and active for share;
   if product.id is null then raise exception 'Producto no disponible para el conteo' using errcode='42501'; end if;
   insert into public.inventory_count_items(business_id,session_id,product_id,expected_stock) values(actor.business_id,session_id,product.id,product.current_stock);
 end loop;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory_session.created','inventory_sessions',session_id,jsonb_build_object('references',selected_count,'pause_sales',p_pause_sales));
 return session_id;
end;$$;

create function public.start_inventory_session(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; old_status text;
begin
 actor:=private.require_profile(true); select status into old_status from public.inventory_sessions where id=p_session_id and business_id=actor.business_id for update;
 if old_status is null or old_status<>'preparation' then raise exception 'La sesión no está en preparación' using errcode='22023'; end if;
 update public.inventory_sessions set status='in_progress',started_at=now(),updated_at=now() where id=p_session_id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory_session.started','inventory_sessions',p_session_id,jsonb_build_object('status','in_progress'));
end;$$;

create function public.record_inventory_count(p_session_id uuid,p_product_id uuid,p_first_count numeric,p_second_count numeric,p_notes text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; session public.inventory_sessions; item public.inventory_count_items; final_value numeric;
begin
 actor:=private.require_profile(); select * into session from public.inventory_sessions where id=p_session_id and business_id=actor.business_id for update;
 if session.id is null or session.status not in ('in_progress','recount') then raise exception 'La sesión no acepta conteos' using errcode='22023'; end if;
 if p_first_count is null or p_first_count<0 or (p_second_count is not null and p_second_count<0) then raise exception 'Conteo inválido' using errcode='22023'; end if;
 select * into item from public.inventory_count_items where session_id=session.id and product_id=p_product_id and business_id=actor.business_id for update;
 if item.id is null then raise exception 'Referencia no incluida en la sesión' using errcode='42501'; end if;
 final_value:=coalesce(p_second_count,p_first_count);
 update public.inventory_count_items set first_count=p_first_count,second_count=p_second_count,final_count=final_value,difference=final_value-expected_stock,notes=nullif(trim(p_notes),''),counted_by=actor.id,recorded_by=actor.id,updated_at=now() where id=item.id;
 update public.inventory_sessions set status=case when p_second_count is not null then 'recount' else status end,updated_at=now() where id=session.id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory_count.recorded','inventory_count_items',item.id,jsonb_build_object('first',p_first_count,'second',p_second_count,'final',final_value));
end;$$;

create function public.submit_inventory_session(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; session public.inventory_sessions; pending_count integer; difference_count integer;
begin
 actor:=private.require_profile(true); select * into session from public.inventory_sessions where id=p_session_id and business_id=actor.business_id for update;
 if session.id is null or session.status not in ('in_progress','recount') then raise exception 'La sesión no está lista para revisión' using errcode='22023'; end if;
 select count(*) filter(where final_count is null),count(*) filter(where final_count is not null and difference<>0) into pending_count,difference_count from public.inventory_count_items where session_id=session.id and business_id=actor.business_id;
 if pending_count>0 then raise exception 'Faltan referencias por contar' using errcode='22023'; end if;
 update public.inventory_sessions set status=case when difference_count>0 then 'pending_approval' else 'completed' end,closed_at=case when difference_count=0 then now() else null end,updated_at=now() where id=session.id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,case when difference_count>0 then 'inventory_session.submitted' else 'inventory_session.completed' end,'inventory_sessions',session.id,jsonb_build_object('differences',difference_count));
end;$$;

create function public.approve_inventory_session(p_session_id uuid,p_approve boolean,p_notes text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; session public.inventory_sessions; item public.inventory_count_items; product public.products; resulting numeric; delta numeric; movement_type text;
begin
 actor:=private.require_profile(true); select * into session from public.inventory_sessions where id=p_session_id and business_id=actor.business_id for update;
 if session.id is null or session.status<>'pending_approval' or p_approve is null then raise exception 'La sesión no está pendiente de aprobación' using errcode='22023'; end if;
 if not p_approve then update public.inventory_sessions set status='recount',updated_at=now() where id=session.id; insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory_session.recount_requested','inventory_sessions',session.id,jsonb_build_object('notes',p_notes)); return; end if;
 for item in select * from public.inventory_count_items where session_id=session.id and business_id=actor.business_id and final_count is not null order by product_id loop
   select * into product from public.products where id=item.product_id and business_id=actor.business_id for update;
   if product.id is null then raise exception 'Producto no disponible para aprobar' using errcode='42501'; end if;
   delta:=item.final_count-product.current_stock;
   if delta<>0 then movement_type:=case when delta>0 then 'entry' else 'exit' end; resulting:=item.final_count; update public.products set current_stock=resulting,updated_at=now() where id=product.id;
     insert into public.inventory_movements(business_id,product_id,movement_type,quantity,previous_stock,resulting_stock,reason,reference_type,reference_id,notes,performed_by,approved_by) values(actor.business_id,product.id,movement_type,abs(delta),product.current_stock,resulting,'correction','inventory_session',session.id,coalesce(nullif(trim(p_notes),''),'Ajuste de conteo físico'),actor.id,actor.id);
     insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory.adjusted','products',product.id,jsonb_build_object('delta',delta,'session_id',session.id));
   end if;
 end loop;
 update public.inventory_sessions set status='completed',closed_at=now(),updated_at=now() where id=session.id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'inventory_session.approved','inventory_sessions',session.id,jsonb_build_object('notes',p_notes));
end;$$;

revoke all on function public.create_inventory_session(text,text,uuid,boolean,jsonb),public.start_inventory_session(uuid),public.record_inventory_count(uuid,uuid,numeric,numeric,text),public.submit_inventory_session(uuid),public.approve_inventory_session(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.create_inventory_session(text,text,uuid,boolean,jsonb),public.start_inventory_session(uuid),public.record_inventory_count(uuid,uuid,numeric,numeric,text),public.submit_inventory_session(uuid),public.approve_inventory_session(uuid,boolean,text) to authenticated;
