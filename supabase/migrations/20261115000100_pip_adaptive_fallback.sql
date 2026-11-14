begin;

create table if not exists public.pip_model_stats (
  model text primary key,
  samples integer not null default 0,
  latency_ms double precision not null default 1500,
  failure_rate double precision not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pip_rate_limits (
  identity_hash text not null,
  window_type text not null,
  window_start timestamptz not null,
  requests integer not null default 0,
  primary key (identity_hash, window_type, window_start)
);

create index if not exists pip_rate_limits_window_start_idx
  on public.pip_rate_limits (window_start);

alter table public.pip_model_stats enable row level security;
alter table public.pip_rate_limits enable row level security;

revoke all on table public.pip_model_stats, public.pip_rate_limits
  from public, anon, authenticated, service_role;
grant select on table public.pip_model_stats to service_role;

-- Upgrade projects that have already applied the four-argument example.
drop function if exists public.pip_check_limit(text, integer, integer, integer);

create or replace function public.pip_check_limit(
  p_identity text,
  p_minute_limit integer,
  p_day_limit integer,
  p_global_limit integer,
  p_global_day_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_minute timestamptz;
  v_day timestamptz;
begin
  if p_identity is null or p_identity !~ '^[0-9a-f]{64}$'
    or coalesce(p_minute_limit, 0) <= 0
    or coalesce(p_day_limit, 0) <= 0
    or coalesce(p_global_limit, 0) <= 0
    or coalesce(p_global_day_limit, 0) <= 0 then
    return false;
  end if;

  -- Evaluate all four quotas under one transaction lock across edge instances.
  perform pg_advisory_xact_lock(1849201);
  v_now := clock_timestamp();
  v_minute := date_trunc('minute', v_now, 'UTC');
  v_day := date_trunc('day', v_now, 'UTC');

  -- Expire old buckets in small batches, including when a valid request is denied.
  delete from public.pip_rate_limits as expired
  where (expired.identity_hash, expired.window_type, expired.window_start) in (
    select identity_hash, window_type, window_start
    from public.pip_rate_limits
    where window_start < v_now - interval '48 hours'
    order by window_start
    limit 128
  );

  if exists (
    select 1
    from (values
      (p_identity, 'minute', v_minute, p_minute_limit),
      (p_identity, 'day', v_day, p_day_limit),
      ('__global__', 'minute', v_minute, p_global_limit),
      ('__global__', 'day', v_day, p_global_day_limit)
    ) as quota(identity_hash, window_type, window_start, max_requests)
    join public.pip_rate_limits as usage using (identity_hash, window_type, window_start)
    where usage.requests >= quota.max_requests
  ) then
    return false;
  end if;

  insert into public.pip_rate_limits as usage (identity_hash, window_type, window_start, requests)
  values
    (p_identity, 'minute', v_minute, 1),
    (p_identity, 'day', v_day, 1),
    ('__global__', 'minute', v_minute, 1),
    ('__global__', 'day', v_day, 1)
  on conflict (identity_hash, window_type, window_start)
  do update set requests = usage.requests + 1;

  return true;
end;
$$;

create or replace function public.pip_record_model(
  p_model text,
  p_latency double precision,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_model is null or p_model !~ '^[a-zA-Z0-9._:/-]{1,200}$'
    or p_latency is null or p_latency < 0 or p_latency > 120000
    or p_success is null then
    raise exception using errcode = '22023', message = 'Invalid Pip model sample';
  end if;

  insert into public.pip_model_stats as stats (model, samples, latency_ms, failure_rate)
  values (p_model, 1, p_latency, case when p_success then 0 else 1 end)
  on conflict (model)
  do update set
    samples = stats.samples + 1,
    latency_ms = stats.latency_ms * 0.8 + excluded.latency_ms * 0.2,
    failure_rate = stats.failure_rate * 0.8 + excluded.failure_rate * 0.2,
    updated_at = now();
end;
$$;

revoke all on function public.pip_check_limit(text, integer, integer, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.pip_record_model(text, double precision, boolean)
  from public, anon, authenticated, service_role;

grant execute on function public.pip_check_limit(text, integer, integer, integer, integer)
  to service_role;
grant execute on function public.pip_record_model(text, double precision, boolean)
  to service_role;

commit;
