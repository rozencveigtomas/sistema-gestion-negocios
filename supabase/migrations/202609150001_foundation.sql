-- Etapa 1: permisos cerrados, escritura solo por funciones y auditoría atómica.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  service_name text not null default 'Gestión Comercio' check (char_length(service_name) between 2 and 100),
  tax_identifier text check (char_length(tax_identifier) <= 30),
  timezone text not null default 'America/Argentina/Buenos_Aires' check (timezone = 'America/Argentina/Buenos_Aires'),
  currency text not null default 'ARS' check (currency = 'ARS'),
  brand_color text not null default '#087f8c' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  support_email text check (support_email is null or char_length(support_email) <= 254),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  auth_user_id uuid not null unique references auth.users(id),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('boss', 'employee')),
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, email)
);

-- Las invitaciones son autorizaciones previas, no perfiles editables del navegador.
create table public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  email text not null check (char_length(email) between 3 and 254),
  name text not null check (char_length(name) between 2 and 100),
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  accepted_by uuid references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create unique index one_pending_invitation on public.employee_invitations (lower(email)) where status = 'pending';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index audit_business_date on public.audit_logs (business_id, created_at desc);
create index profile_business on public.profiles (business_id);

create function private.current_profile() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select p from public.profiles p join public.businesses b on b.id = p.business_id
  where p.auth_user_id = auth.uid() and p.active and b.active;
$$;

create function private.business_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select (private.current_profile()).business_id;
$$;

create function private.is_boss() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.current_profile()).role = 'boss', false);
$$;

create function private.require_profile(boss_only boolean default false) returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles;
begin
  actor := private.current_profile();
  if actor.id is null or (boss_only and actor.role <> 'boss') then
    raise exception 'Operación no autorizada' using errcode = '42501';
  end if;
  return actor;
end;
$$;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.employee_invitations enable row level security;
alter table public.audit_logs enable row level security;

create policy business_read on public.businesses for select to authenticated
  using (id = (select private.business_id()));
create policy profile_read on public.profiles for select to authenticated
  using (business_id = (select private.business_id()) and (auth_user_id = (select auth.uid()) or (select private.is_boss())));
create policy invitation_read on public.employee_invitations for select to authenticated
  using (business_id = (select private.business_id()) and (select private.is_boss()));
create policy audit_read on public.audit_logs for select to authenticated
  using (business_id = (select private.business_id()) and (select private.is_boss()));

revoke all on public.businesses, public.profiles, public.employee_invitations, public.audit_logs from anon, authenticated;
grant select on public.businesses, public.profiles, public.employee_invitations, public.audit_logs to authenticated;

create function public.update_business(p_name text, p_service_name text, p_tax_identifier text, p_brand_color text, p_support_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; old_row public.businesses; new_row public.businesses;
begin
  actor := private.require_profile(true);
  select * into old_row from public.businesses where id = actor.business_id for update;
  update public.businesses set name = trim(p_name), service_name = trim(p_service_name),
    tax_identifier = nullif(trim(p_tax_identifier), ''), brand_color = p_brand_color,
    support_email = nullif(trim(p_support_email), ''), updated_at = now()
  where id = actor.business_id returning * into new_row;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, previous_values, new_values)
  values (actor.business_id, actor.id, 'business.updated', 'businesses', actor.business_id, to_jsonb(old_row), to_jsonb(new_row));
end;
$$;

create function public.update_employee(p_profile_id uuid, p_name text, p_role text, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; old_row public.profiles; new_row public.profiles;
begin
  actor := private.require_profile(true);
  -- Serializa cambios de responsables para conservar al menos un jefe activo.
  perform 1 from public.businesses where id = actor.business_id for update;
  select * into old_row from public.profiles where id = p_profile_id and business_id = actor.business_id for update;
  if old_row.id is null then raise exception 'Usuario no disponible' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('boss','employee') or p_active is null then
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;
  if old_row.role = 'boss' and old_row.active and (p_role <> 'boss' or not p_active) and
    not exists (select 1 from public.profiles where business_id = actor.business_id and role = 'boss' and active and id <> old_row.id) then
    raise exception 'Debe quedar al menos un jefe activo' using errcode = '22023';
  end if;
  update public.profiles set name = trim(p_name), role = p_role, active = p_active, updated_at = now()
  where id = old_row.id returning * into new_row;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, previous_values, new_values)
  values (actor.business_id, actor.id, 'employee.updated', 'profiles', old_row.id, to_jsonb(old_row), to_jsonb(new_row));
end;
$$;

create function public.create_employee_invitation(p_name text, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles; invitation_id uuid; email_normalized text := lower(trim(p_email));
begin
  actor := private.require_profile(true);
  if email_normalized is null or email_normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Correo inválido' using errcode = '22023';
  end if;
  if exists(select 1 from public.profiles where lower(email) = email_normalized) then
    raise exception 'No se puede invitar esa cuenta' using errcode = '22023';
  end if;
  insert into public.employee_invitations (business_id, name, email, invited_by)
  values (actor.business_id, trim(p_name), email_normalized, actor.id) returning id into invitation_id;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_values)
  values (actor.business_id, actor.id, 'invitation.created', 'employee_invitations', invitation_id, jsonb_build_object('email', email_normalized));
  return invitation_id;
end;
$$;

create function public.revoke_employee_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles;
begin
  actor := private.require_profile(true);
  update public.employee_invitations set status = 'revoked' where id = p_invitation_id and business_id = actor.business_id and status = 'pending';
  if not found then raise exception 'Invitación no disponible' using errcode = '22023'; end if;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id)
  values (actor.business_id, actor.id, 'invitation.revoked', 'employee_invitations', p_invitation_id);
end;
$$;

-- Se usa la identidad del servidor de Auth, no metadatos de rol proporcionados al registrarse.
create function public.accept_employee_invitation() returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.employee_invitations; identity_email text; profile_id uuid;
begin
  select lower(email) into identity_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if identity_email is null then raise exception 'Identidad no confirmada' using errcode = '42501'; end if;
  select id into profile_id from public.profiles where auth_user_id = auth.uid();
  if profile_id is not null then return profile_id; end if;
  select i.* into invitation from public.employee_invitations i join public.businesses b on b.id = i.business_id
    where lower(i.email) = identity_email and i.status = 'pending' and i.expires_at > now() and b.active for update of i;
  if invitation.id is null then raise exception 'Invitación no disponible' using errcode = '42501'; end if;
  insert into public.profiles (business_id, auth_user_id, name, email, role)
  values (invitation.business_id, auth.uid(), invitation.name, identity_email, 'employee') returning id into profile_id;
  update public.employee_invitations set status = 'accepted', accepted_by = profile_id where id = invitation.id;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id)
  values (invitation.business_id, profile_id, 'invitation.accepted', 'employee_invitations', invitation.id);
  return profile_id;
end;
$$;

create function public.record_login() returns void
language plpgsql security definer set search_path = '' as $$
declare actor public.profiles;
begin
  actor := private.require_profile();
  update public.profiles set last_login_at = now() where id = actor.id;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id)
  values (actor.business_id, actor.id, 'session.login', 'profiles', actor.id);
end;
$$;

-- Límite compartido entre instancias del servidor. Nunca se guarda contraseña ni correo en claro.
create table private.auth_attempts (
  key_hash text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table private.auth_attempts enable row level security;

create function public.consume_auth_attempt(p_key_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'Clave inválida' using errcode = '22023'; end if;
  insert into private.auth_attempts (key_hash, window_start, attempts) values (p_key_hash, now(), 1)
  on conflict (key_hash) do update set
    attempts = case when private.auth_attempts.window_start < now() - interval '15 minutes' then 1 else private.auth_attempts.attempts + 1 end,
    window_start = case when private.auth_attempts.window_start < now() - interval '15 minutes' then now() else private.auth_attempts.window_start end
  returning attempts into n;
  delete from private.auth_attempts where window_start < now() - interval '1 day';
  return n <= 8;
end;
$$;

create function public.bootstrap_business(p_auth_user_id uuid, p_email text, p_name text, p_business_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare business_uuid uuid; profile_uuid uuid;
begin
  if not exists(select 1 from auth.users where id = p_auth_user_id and lower(email) = lower(p_email)) then
    raise exception 'La identidad no coincide' using errcode = '22023';
  end if;
  insert into public.businesses (name) values (trim(p_business_name)) returning id into business_uuid;
  insert into public.profiles (business_id, auth_user_id, name, email, role)
  values (business_uuid, p_auth_user_id, trim(p_name), lower(trim(p_email)), 'boss') returning id into profile_uuid;
  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id)
  values (business_uuid, profile_uuid, 'business.created', 'businesses', business_uuid);
  return business_uuid;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.business_id(), private.is_boss() to authenticated;
revoke all on function public.update_business(text,text,text,text,text), public.update_employee(uuid,text,text,boolean),
  public.create_employee_invitation(text,text), public.revoke_employee_invitation(uuid), public.accept_employee_invitation(),
  public.record_login(), public.consume_auth_attempt(text), public.bootstrap_business(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.update_business(text,text,text,text,text), public.update_employee(uuid,text,text,boolean),
  public.create_employee_invitation(text,text), public.revoke_employee_invitation(uuid), public.accept_employee_invitation(), public.record_login()
  to authenticated;
grant execute on function public.consume_auth_attempt(text), public.bootstrap_business(uuid,text,text,text) to service_role;
