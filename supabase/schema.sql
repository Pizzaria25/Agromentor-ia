-- PATCH: garantir updated_at em todas as tabelas que o app usa

-- 1) função (se ainda não existir)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2) subscriptions: add updated_at (já existe no seu create, mas garante)
alter table public.subscriptions
  add column if not exists updated_at timestamptz not null default now();

-- 3) report_credits: add updated_at (já existe no seu create, mas garante)
alter table public.report_credits
  add column if not exists updated_at timestamptz not null default now();

-- 4) usage_weekly: add updated_at (já existe no seu create, mas garante)
alter table public.usage_weekly
  add column if not exists updated_at timestamptz not null default now();

-- 5) reports: adicionar updated_at (NO SEU CREATE NÃO TEM)
alter table public.reports
  add column if not exists updated_at timestamptz not null default now();

-- 6) triggers (opcional, mas recomendado)
drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_report_credits_updated_at on public.report_credits;
create trigger set_report_credits_updated_at
before update on public.report_credits
for each row execute procedure public.set_updated_at();

drop trigger if exists set_usage_weekly_updated_at on public.usage_weekly;
create trigger set_usage_weekly_updated_at
before update on public.usage_weekly
for each row execute procedure public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
before update on public.reports
for each row execute procedure public.set_updated_at();

-- 7) índices (se o app listar por updated_at)
create index if not exists reports_updated_at_idx on public.reports(updated_at);
create index if not exists subscriptions_updated_at_idx on public.subscriptions(updated_at);
create index if not exists report_credits_updated_at_idx on public.report_credits(updated_at);
create index if not exists usage_weekly_updated_at_idx on public.usage_weekly(updated_at);