-- Etapa 6: suscripción configurable y confirmación manual, sin confiar en comprobantes.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  plan_name text not null default 'Plan comercio' check (char_length(trim(plan_name)) between 2 and 100),
  monthly_amount numeric(14,2) check (monthly_amount is null or monthly_amount > 0),
  currency text not null default 'ARS' check (currency='ARS'),
  payment_url text check (payment_url is null or payment_url ~ '^https://'),
  status text not null default 'pending_setup' check (status in ('active','upcoming','due_soon','overdue','pending_setup','suspended')),
  last_paid_at timestamptz,
  next_due_at timestamptz,
  grace_period_days integer not null default 7 check (grace_period_days between 0 and 90),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id), unique (business_id,id)
);
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  subscription_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency='ARS'),
  payment_method text not null default 'lemon' check (payment_method in ('lemon','transfer','cash','other')),
  external_reference text check (char_length(external_reference) <= 160),
  receipt_url text check (receipt_url is null or receipt_url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  submitted_by uuid not null,
  verified_by uuid,
  paid_at timestamptz,
  verified_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (business_id,id),
  foreign key (business_id,subscription_id) references public.subscriptions(business_id,id),
  foreign key (business_id,submitted_by) references public.profiles(business_id,id),
  foreign key (business_id,verified_by) references public.profiles(business_id,id)
);
create index subscription_payment_business_date on public.subscription_payments(business_id,created_at desc);
alter table public.subscriptions enable row level security;alter table public.subscription_payments enable row level security;
create policy subscription_read on public.subscriptions for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
create policy subscription_payment_read on public.subscription_payments for select to authenticated using (business_id=(select private.business_id()) and (select private.is_boss()));
revoke all on public.subscriptions,public.subscription_payments from anon,authenticated;grant select on public.subscriptions,public.subscription_payments to authenticated;

create function public.update_subscription_settings(p_plan_name text,p_monthly_amount numeric,p_payment_url text,p_next_due_at timestamptz,p_grace_period_days integer default 7) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; subscription_id uuid; normalized_url text:=nullif(trim(p_payment_url),'');
begin
 actor:=private.require_profile(true);
 if p_plan_name is null or char_length(trim(p_plan_name))<2 or (p_monthly_amount is not null and p_monthly_amount<=0) or (normalized_url is not null and normalized_url !~ '^https://') or (p_next_due_at is not null and p_next_due_at<now()-interval '1 year') or p_grace_period_days is null or p_grace_period_days<0 or p_grace_period_days>90 then raise exception 'Configuración de suscripción inválida' using errcode='22023'; end if;
 insert into public.subscriptions(business_id,plan_name,monthly_amount,payment_url,status,next_due_at,grace_period_days) values(actor.business_id,trim(p_plan_name),p_monthly_amount,normalized_url,case when p_monthly_amount is null or normalized_url is null then 'pending_setup' when p_next_due_at is null then 'upcoming' when p_next_due_at<now() then 'overdue' when p_next_due_at<=now()+interval '7 days' then 'due_soon' else 'active' end,p_next_due_at,p_grace_period_days)
 on conflict (business_id) do update set plan_name=excluded.plan_name,monthly_amount=excluded.monthly_amount,payment_url=excluded.payment_url,status=excluded.status,next_due_at=excluded.next_due_at,grace_period_days=excluded.grace_period_days,updated_at=now() returning id into subscription_id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'subscription.updated','subscriptions',subscription_id,jsonb_build_object('plan_name',trim(p_plan_name),'monthly_amount',p_monthly_amount,'payment_configured',normalized_url is not null));
 return subscription_id;
end;$$;

create function public.submit_subscription_payment(p_amount numeric,p_payment_method text,p_external_reference text,p_receipt_url text,p_paid_at timestamptz,p_notes text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; subscription public.subscriptions; payment_id uuid;
begin
 actor:=private.require_profile(true);select * into subscription from public.subscriptions where business_id=actor.business_id for update;
 if subscription.id is null or subscription.monthly_amount is null or p_amount is null or p_amount<>subscription.monthly_amount or p_payment_method not in ('lemon','transfer','cash','other') or (p_receipt_url is not null and p_receipt_url !~ '^https://') or p_paid_at is null or p_paid_at>now()+interval '5 minutes' or p_paid_at<now()-interval '1 year' then raise exception 'Comprobante de suscripción inválido' using errcode='22023'; end if;
 insert into public.subscription_payments(business_id,subscription_id,amount,payment_method,external_reference,receipt_url,status,submitted_by,paid_at,notes) values(actor.business_id,subscription.id,p_amount,p_payment_method,nullif(trim(p_external_reference),''),nullif(trim(p_receipt_url),''),'pending',actor.id,p_paid_at,nullif(trim(p_notes),'')) returning id into payment_id;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,'subscription.payment_submitted','subscription_payments',payment_id,jsonb_build_object('amount',p_amount,'status','pending'));
 return payment_id;
end;$$;

create function public.verify_subscription_payment(p_payment_id uuid,p_approve boolean,p_notes text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.profiles; payment public.subscription_payments; subscription public.subscriptions;
begin
 actor:=private.require_profile(true);select * into payment from public.subscription_payments where id=p_payment_id and business_id=actor.business_id for update;select * into subscription from public.subscriptions where id=payment.subscription_id and business_id=actor.business_id for update;
 if payment.id is null or subscription.id is null or payment.status<>'pending' or p_approve is null then raise exception 'Pago no disponible para verificar' using errcode='22023'; end if;
 if p_approve then update public.subscription_payments set status='verified',verified_by=actor.id,verified_at=now(),notes=coalesce(nullif(trim(p_notes),''),notes) where id=payment.id;update public.subscriptions set status='active',last_paid_at=coalesce(payment.paid_at,now()),next_due_at=coalesce(payment.paid_at,now())+interval '1 month',updated_at=now() where id=subscription.id; else update public.subscription_payments set status='rejected',verified_by=actor.id,verified_at=now(),notes=nullif(trim(p_notes),'') where id=payment.id; end if;
 insert into public.audit_logs(business_id,user_id,action,entity_type,entity_id,new_values) values(actor.business_id,actor.id,case when p_approve then 'subscription.payment_verified' else 'subscription.payment_rejected' end,'subscription_payments',payment.id,jsonb_build_object('approved',p_approve));
end;$$;

revoke all on function public.update_subscription_settings(text,numeric,text,timestamptz,integer),public.submit_subscription_payment(numeric,text,text,text,timestamptz,text),public.verify_subscription_payment(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.update_subscription_settings(text,numeric,text,timestamptz,integer),public.submit_subscription_payment(numeric,text,text,text,timestamptz,text),public.verify_subscription_payment(uuid,boolean,text) to authenticated;
