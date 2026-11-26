-- Admin analytics: first-party event tracking plus an admin-only report.
--
-- What it adds
--   analytics_events          one row per tracked event (page views, checkout steps, promo use).
--                             Nobody can read it through the API; rows only go in via track_event().
--   site_admins               emails allowed to open /admin/analytics while signed in.
--   analytics_access_keys     SHA-256 hashes of secret keys for the private link
--                             /admin/analytics/<key>, which works without signing in.
--   track_event(...)          validated insert, callable by anyone (anon included).
--   get_admin_analytics(...)  the dashboard report. Returns data only to a signed-in site admin
--                             or to a caller holding a valid access key; everyone else gets an error.
--
-- After running this file, add yourself as an admin and/or create a private link key:
--
--   insert into public.site_admins (email) values ('you@example.com');
--
--   -- pick a long random key, e.g. the output of: openssl rand -hex 24
--   insert into public.analytics_access_keys (label, key_hash)
--   values ('my private link', encode(sha256(convert_to('PASTE-YOUR-KEY-HERE', 'UTF8')), 'hex'));
--
--   Then open https://www.ezsignnow.com/admin/analytics/PASTE-YOUR-KEY-HERE
--   To revoke the link: delete from public.analytics_access_keys where label = 'my private link';

-- ── Events ────────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null,
  path text,
  visitor_id text,
  session_id text,
  user_id uuid,
  referrer text,
  promo_code text,
  plan text,
  device text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);

alter table public.analytics_events enable row level security;
-- No policies: the table is unreadable and unwritable through the API.
revoke all on public.analytics_events from anon, authenticated;

-- ── Admins and private-link keys ──────────────────────────────────────────
create table if not exists public.site_admins (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create table if not exists public.analytics_access_keys (
  id bigint generated always as identity primary key,
  label text,
  key_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.analytics_access_keys enable row level security;
revoke all on public.analytics_access_keys from anon, authenticated;

-- ── Tracking ──────────────────────────────────────────────────────────────
create or replace function public.track_event(
  p_event_type text,
  p_path text default null,
  p_visitor_id text default null,
  p_session_id text default null,
  p_referrer text default null,
  p_promo_code text default null,
  p_plan text default null,
  p_device text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only known event types, and every text field capped, so the endpoint can't be used as free storage.
  if p_event_type not in (
    'page_view', 'checkout_view', 'promo_applied', 'promo_rejected',
    'checkout_completed', 'free_plan_chosen', 'signup'
  ) then
    return;
  end if;

  insert into public.analytics_events
    (event_type, path, visitor_id, session_id, user_id, referrer, promo_code, plan, device, metadata)
  values (
    p_event_type,
    left(p_path, 300),
    left(p_visitor_id, 64),
    left(p_session_id, 64),
    auth.uid(),
    left(p_referrer, 300),
    upper(left(p_promo_code, 40)),
    left(p_plan, 40),
    left(p_device, 20),
    case
      when p_metadata is null or jsonb_typeof(p_metadata) <> 'object' or length(p_metadata::text) > 2000
        then '{}'::jsonb
      else p_metadata
    end
  );
end;
$$;

grant execute on function public.track_event(text, text, text, text, text, text, text, text, jsonb) to anon, authenticated;

-- ── Access check ──────────────────────────────────────────────────────────
create or replace function public.analytics_access_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.site_admins a
      join auth.users u on lower(u.email) = lower(a.email)
      where u.id = auth.uid()
        and u.email_confirmed_at is not null
    )
    or (
      coalesce(length(p_key), 0) >= 16
      and exists (
        select 1 from public.analytics_access_keys k
        where k.key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
      )
    );
$$;

revoke all on function public.analytics_access_ok(text) from public, anon, authenticated;

-- ── Report ────────────────────────────────────────────────────────────────
create or replace function public.get_admin_analytics(p_days integer default 30, p_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_result jsonb;
begin
  if not public.analytics_access_ok(p_key) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  with ev as (
    select * from public.analytics_events where created_at >= v_since
  ),
  pv as (
    select * from ev where event_type = 'page_view'
  ),
  days as (
    select generate_series(date_trunc('day', v_since), date_trunc('day', now()), interval '1 day')::date as day
  )
  select jsonb_build_object(
    'generated_at', now(),
    'days', v_days,
    'all_time_visits', (select visit_count from public.site_stats where id = 1),
    'totals', jsonb_build_object(
      'page_views', (select count(*) from pv),
      'visitors', (select count(distinct visitor_id) from pv),
      'sessions', (select count(distinct session_id) from pv),
      'visitors_today', (select count(distinct visitor_id) from pv where created_at >= date_trunc('day', now())),
      'page_views_today', (select count(*) from pv where created_at >= date_trunc('day', now())),
      'checkout_views', (select count(*) from ev where event_type = 'checkout_view'),
      'checkout_visitors', (select count(distinct visitor_id) from ev where event_type = 'checkout_view'),
      'checkouts_completed', (select count(*) from ev where event_type = 'checkout_completed'),
      'checkouts_with_promo', (select count(*) from ev where event_type = 'checkout_completed' and promo_code is not null),
      'free_plan_chosen', (select count(*) from ev where event_type = 'free_plan_chosen'),
      'promo_applied', (select count(*) from ev where event_type = 'promo_applied'),
      'promo_rejected', (select count(*) from ev where event_type = 'promo_rejected'),
      'signups', (select count(*) from auth.users where created_at >= v_since),
      'users_total', (select count(*) from auth.users),
      'documents_created', (select count(*) from public.documents where created_at >= v_since),
      'documents_completed', (select count(*) from public.documents where created_at >= v_since and status = 'completed'),
      'signatures', (select count(*) from public.signatories where signed_at >= v_since)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'page_views', (select count(*) from pv where created_at::date = d.day),
        'visitors', (select count(distinct visitor_id) from pv where created_at::date = d.day),
        'checkouts', (select count(*) from ev where event_type = 'checkout_completed' and created_at::date = d.day),
        'signups', (select count(*) from auth.users u where u.created_at::date = d.day)
      ) order by d.day)
      from days d
    ), '[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(t order by t.views desc)
      from (
        select path, count(*) as views, count(distinct visitor_id) as visitors
        from pv group by path order by count(*) desc limit 25
      ) t
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(t order by t.visits desc)
      from (
        select referrer, count(distinct session_id) as visits
        from pv where referrer is not null and referrer <> ''
        group by referrer order by count(distinct session_id) desc limit 15
      ) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(t order by t.visitors desc)
      from (
        select coalesce(device, 'unknown') as device, count(distinct visitor_id) as visitors
        from pv group by coalesce(device, 'unknown')
      ) t
    ), '[]'::jsonb),
    'promo_codes', coalesce((
      select jsonb_agg(t order by t.checkouts desc, t.applied desc)
      from (
        select promo_code,
          count(*) filter (where event_type = 'promo_applied') as applied,
          count(*) filter (where event_type = 'promo_rejected') as rejected,
          count(*) filter (where event_type = 'checkout_completed') as checkouts
        from ev where promo_code is not null
        group by promo_code
      ) t
    ), '[]'::jsonb),
    'recent_checkouts', coalesce((
      select jsonb_agg(t order by t.created_at desc)
      from (
        select e.created_at, e.event_type, e.plan, e.promo_code,
          (e.metadata ->> 'trial_days')::int as trial_days,
          coalesce(p.email, u.email) as email
        from ev e
        left join auth.users u on u.id = e.user_id
        left join public.profiles p on p.user_id = e.user_id
        where e.event_type in ('checkout_completed', 'free_plan_chosen')
        order by e.created_at desc limit 25
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_analytics(integer, text) from public;
grant execute on function public.get_admin_analytics(integer, text) to anon, authenticated;
