-- AgroMentor IA v2.3 — contador exato, owner mode completo, logs e PDF real
-- Execute no SQL Editor do Supabase

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_type text default 'pendente',
  name text,
  crea text,
  institution text,
  semester text,
  property_name text,
  municipality text,
  cpf text,
  has_signature boolean default false,
  signature_url text,
  email text,
  full_name text,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table public.user_profiles add column if not exists profile_type text default 'pendente';
alter table public.user_profiles add column if not exists name text;
alter table public.user_profiles add column if not exists crea text;
alter table public.user_profiles add column if not exists institution text;
alter table public.user_profiles add column if not exists semester text;
alter table public.user_profiles add column if not exists property_name text;
alter table public.user_profiles add column if not exists municipality text;
alter table public.user_profiles add column if not exists cpf text;
alter table public.user_profiles add column if not exists has_signature boolean default false;
alter table public.user_profiles add column if not exists signature_url text;
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists last_seen_at timestamptz;
alter table public.user_profiles add column if not exists updated_at timestamptz default now();
alter table public.user_profiles alter column name drop not null;
alter table public.user_profiles alter column profile_type set default 'pendente';
update public.user_profiles set profile_type = 'pendente' where profile_type is null;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_profiles_profile_type_check') then
    alter table public.user_profiles drop constraint user_profiles_profile_type_check;
  end if;
exception when undefined_table then
  null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_profile_type_check_v2') then
    alter table public.user_profiles
      add constraint user_profiles_profile_type_check_v2
      check (profile_type in ('pendente','estudante','agronomo','produtor','usina'));
  end if;
exception when undefined_table then
  null;
end $$;

create table if not exists public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  messages_used integer not null default 0,
  messages_limit integer not null default 20,
  laudos_used integer not null default 0,
  laudos_limit integer not null default 1,
  can_use_images boolean not null default false,
  is_trial boolean not null default true,
  is_owner boolean not null default false,
  trial_ends_at timestamptz default (now() + interval '3 days'),
  expires_at timestamptz,
  plan text not null default 'trial',
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.usage_limits add column if not exists messages_used integer default 0;
alter table public.usage_limits add column if not exists messages_limit integer default 20;
alter table public.usage_limits add column if not exists laudos_used integer default 0;
alter table public.usage_limits add column if not exists laudos_limit integer default 1;
alter table public.usage_limits add column if not exists can_use_images boolean default false;
alter table public.usage_limits add column if not exists is_trial boolean default true;
alter table public.usage_limits add column if not exists is_owner boolean default false;
alter table public.usage_limits add column if not exists trial_ends_at timestamptz default (now() + interval '3 days');
alter table public.usage_limits add column if not exists expires_at timestamptz;
alter table public.usage_limits add column if not exists plan text default 'trial';
alter table public.usage_limits add column if not exists updated_at timestamptz default now();

create table if not exists public.laudo_signatures (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  token text not null unique,
  status text default 'pending' check (status in ('pending','signed','expired')),
  signer_name text,
  signer_crea text,
  signature_type text default 'text',
  signed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  culture text,
  municipality text,
  area_ha numeric,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id),
  title text not null,
  content jsonb,
  created_at timestamptz default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  quantity integer not null default 1,
  estimated_cost numeric null,
  meta jsonb null,
  request_id text null,
  created_at timestamptz not null default now()
);

alter table public.usage_events add column if not exists request_id text;
create index if not exists idx_usage_events_user_id on public.usage_events(user_id);
create index if not exists idx_usage_events_created_at on public.usage_events(created_at);
create unique index if not exists idx_usage_events_request_unique
  on public.usage_events(user_id, event_type, request_id)
  where request_id is not null;

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info' check (level in ('info','warn','error')),
  source text not null,
  message text not null,
  details jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_logs_created_at on public.system_logs(created_at desc);
create index if not exists idx_system_logs_level on public.system_logs(level);
create index if not exists idx_system_logs_source on public.system_logs(source);

alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles_self" on public.user_profiles;
create policy "user_profiles_self" on public.user_profiles for all using (auth.uid() = user_id);

alter table public.usage_limits enable row level security;
drop policy if exists "usage_limits_self" on public.usage_limits;
create policy "usage_limits_self" on public.usage_limits for all using (auth.uid() = user_id);

alter table public.laudo_signatures enable row level security;
drop policy if exists "laudo_signatures_public_token" on public.laudo_signatures;
drop policy if exists "laudo_signatures_public_update" on public.laudo_signatures;
create policy "laudo_signatures_public_token" on public.laudo_signatures for select using (true);
create policy "laudo_signatures_public_update" on public.laudo_signatures for update using (status = 'pending');

alter table public.cases enable row level security;
drop policy if exists "cases_self" on public.cases;
create policy "cases_self" on public.cases for all using (auth.uid() = user_id);

alter table public.chat_threads enable row level security;
drop policy if exists "threads_self" on public.chat_threads;
create policy "threads_self" on public.chat_threads for all using (auth.uid() = user_id);

alter table public.chat_messages enable row level security;
drop policy if exists "messages_self" on public.chat_messages;
create policy "messages_self" on public.chat_messages for all using (
  thread_id in (select id from public.chat_threads where user_id = auth.uid())
);

alter table public.reports enable row level security;
drop policy if exists "reports_self" on public.reports;
create policy "reports_self" on public.reports for all using (auth.uid() = user_id);

alter table public.usage_events enable row level security;
drop policy if exists "usage_events_self" on public.usage_events;
create policy "usage_events_self" on public.usage_events for select using (auth.uid() = user_id);

alter table public.system_logs enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.usage_limits (
    user_id, messages_used, messages_limit, laudos_used, laudos_limit,
    can_use_images, is_trial, is_owner, trial_ends_at, plan, updated_at
  )
  values (
    new.id, 0, 20, 0, 1,
    false, true, false, now() + interval '3 days', 'trial', now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.consume_chat_usage(
  p_user_id uuid,
  p_request_id text,
  p_event_type text default 'chat_message',
  p_meta jsonb default null
)
returns table(consumed boolean, used integer, limit_value integer, is_owner boolean)
language plpgsql
security definer
as $$
declare
  v_usage public.usage_limits%rowtype;
begin
  select * into v_usage from public.usage_limits where user_id = p_user_id for update;

  if not found then
    insert into public.usage_limits (
      user_id, plan, is_trial, is_owner, messages_used, messages_limit,
      laudos_used, laudos_limit, can_use_images, trial_ends_at, updated_at
    )
    values (
      p_user_id, 'trial', true, false, 0, 20,
      0, 1, false, now() + interval '3 days', now()
    )
    returning * into v_usage;
  end if;

  if v_usage.is_owner then
    return query select false, 0, v_usage.messages_limit, true;
    return;
  end if;

  if p_request_id is not null and exists (
    select 1 from public.usage_events
    where user_id = p_user_id and event_type = p_event_type and request_id = p_request_id
  ) then
    return query select false, v_usage.messages_used, v_usage.messages_limit, false;
    return;
  end if;

  if v_usage.messages_used >= v_usage.messages_limit then
    return query select false, v_usage.messages_used, v_usage.messages_limit, false;
    return;
  end if;

  update public.usage_limits
  set messages_used = messages_used + 1,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_usage;

  insert into public.usage_events (user_id, event_type, quantity, meta, request_id, created_at)
  values (p_user_id, p_event_type, 1, p_meta, p_request_id, now())
  on conflict do nothing;

  return query select true, v_usage.messages_used, v_usage.messages_limit, false;
end;
$$;

create or replace function public.consume_laudo_usage(
  p_user_id uuid,
  p_request_id text,
  p_meta jsonb default null
)
returns table(consumed boolean, used integer, limit_value integer, is_owner boolean)
language plpgsql
security definer
as $$
declare
  v_usage public.usage_limits%rowtype;
begin
  select * into v_usage from public.usage_limits where user_id = p_user_id for update;

  if not found then
    insert into public.usage_limits (
      user_id, plan, is_trial, is_owner, messages_used, messages_limit,
      laudos_used, laudos_limit, can_use_images, trial_ends_at, updated_at
    )
    values (
      p_user_id, 'trial', true, false, 0, 20,
      0, 1, false, now() + interval '3 days', now()
    )
    returning * into v_usage;
  end if;

  if v_usage.is_owner then
    return query select false, 0, v_usage.laudos_limit, true;
    return;
  end if;

  if p_request_id is not null and exists (
    select 1 from public.usage_events
    where user_id = p_user_id and event_type = 'laudo' and request_id = p_request_id
  ) then
    return query select false, v_usage.laudos_used, v_usage.laudos_limit, false;
    return;
  end if;

  if v_usage.laudos_used >= v_usage.laudos_limit then
    return query select false, v_usage.laudos_used, v_usage.laudos_limit, false;
    return;
  end if;

  update public.usage_limits
  set laudos_used = laudos_used + 1,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_usage;

  insert into public.usage_events (user_id, event_type, quantity, meta, request_id, created_at)
  values (p_user_id, 'laudo', 1, p_meta, p_request_id, now())
  on conflict do nothing;

  return query select true, v_usage.laudos_used, v_usage.laudos_limit, false;
end;
$$;

-- =============================================
-- FIX: Garantir que owners sempre têm can_use_images = true
-- Execute isso se o owner não conseguir usar imagens
-- =============================================
UPDATE public.usage_limits
SET can_use_images = true, is_owner = true, plan = 'owner'
WHERE user_id IN (
  SELECT up.user_id FROM public.user_profiles up
  WHERE up.email IN (
    SELECT unnest(string_to_array(current_setting('app.owner_emails', true), ','))
  )
);

-- Trigger para garantir que upsert nunca falha por duplicate key
CREATE OR REPLACE FUNCTION public.safe_upsert_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = NEW.user_id) THEN
    UPDATE public.user_profiles SET
      email = COALESCE(NEW.email, email),
      full_name = COALESCE(NEW.full_name, full_name),
      name = COALESCE(NEW.name, name),
      profile_type = CASE WHEN NEW.profile_type = 'pendente' THEN profile_type ELSE COALESCE(NEW.profile_type, profile_type) END,
      institution = COALESCE(NEW.institution, institution),
      semester = COALESCE(NEW.semester, semester),
      crea = COALESCE(NEW.crea, crea),
      property_name = COALESCE(NEW.property_name, property_name),
      municipality = COALESCE(NEW.municipality, municipality),
      cpf = COALESCE(NEW.cpf, cpf),
      last_seen_at = NEW.last_seen_at,
      updated_at = NEW.updated_at
    WHERE user_id = NEW.user_id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_profile_insert ON public.user_profiles;
CREATE TRIGGER before_profile_insert
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.safe_upsert_profile();
