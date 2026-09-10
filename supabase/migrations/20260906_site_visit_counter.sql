-- Global site visit counter: a single-row table plus an atomic increment RPC.
-- The VisitorCounter component reads the total and calls increment_site_visits()
-- once per browser session.

create table if not exists public.site_stats (
  id smallint primary key default 1,
  visit_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint site_stats_singleton check (id = 1)
);

insert into public.site_stats (id, visit_count)
values (1, 0)
on conflict (id) do nothing;

-- Atomic increment, returns the new running total. SECURITY DEFINER so
-- anonymous visitors can bump the count without any direct write grant on
-- the table itself.
create or replace function public.increment_site_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.site_stats
  set visit_count = visit_count + 1,
      updated_at = now()
  where id = 1
  returning visit_count;
$$;

alter table public.site_stats enable row level security;

drop policy if exists "site_stats public read" on public.site_stats;
create policy "site_stats public read" on public.site_stats
  for select using (true);

grant select on public.site_stats to anon, authenticated;
grant execute on function public.increment_site_visits() to anon, authenticated;
