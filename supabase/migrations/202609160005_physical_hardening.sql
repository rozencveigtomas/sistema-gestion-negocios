-- Endurecimiento del control físico: pausa real de ventas y responsable de aprobación.
alter table public.inventory_sessions add column if not exists notes text check (char_length(notes) <= 2000);
alter table public.inventory_sessions add column if not exists approved_by uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='inventory_sessions_business_approved_by_fkey') then
    alter table public.inventory_sessions add constraint inventory_sessions_business_approved_by_fkey foreign key (business_id,approved_by) references public.profiles(business_id,id);
  end if;
end $$;

create or replace function public.enforce_inventory_sales_pause() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists (select 1 from public.inventory_sessions where business_id=new.business_id and pause_sales and status in ('in_progress','recount')) then
    raise exception 'Las ventas están pausadas durante el inventario físico' using errcode='22023';
  end if;
  return new;
end;$$;
drop trigger if exists inventory_sales_pause on public.sales;
create trigger inventory_sales_pause before insert on public.sales for each row execute function public.enforce_inventory_sales_pause();

create or replace function public.set_inventory_approval_actor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='completed' and old.status='pending_approval' and new.approved_by is null then
    select id into new.approved_by from public.profiles where business_id=new.business_id and auth_user_id=auth.uid() and active;
  end if;
  return new;
end;$$;
drop trigger if exists inventory_approval_actor on public.inventory_sessions;
create trigger inventory_approval_actor before update of status on public.inventory_sessions for each row execute function public.set_inventory_approval_actor();

revoke all on function public.enforce_inventory_sales_pause(),public.set_inventory_approval_actor() from public,anon,authenticated;
