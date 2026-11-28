-- Company boards post few PM roles a day (about 6 in 72 hours across 128 boards, about 47 in two weeks), so the feed keeps two weeks.
-- Postings under 3 days old are flagged as new in the app, and freshness weighs 15% of the match score (see scoreMatch in the ATS engine).
drop policy if exists "paid read fresh jobs" on public.jobs;
create policy "paid read fresh jobs" on public.jobs for select to authenticated
  using (public.has_access(auth.uid()) and is_active and coalesce(posted_at, first_seen_at) >= now() - interval '14 days');

create or replace function public.finish_scrape(ok_companies text[], run_started timestamptz)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare gone integer; old integer;
begin
  update public.jobs set is_active = false
    where is_active and company_id = any(ok_companies) and last_seen_at < run_started;
  get diagnostics gone = row_count;
  delete from public.jobs
    where coalesce(posted_at, first_seen_at) < now() - interval '14 days' or (not is_active and last_seen_at < now() - interval '1 day');
  get diagnostics old = row_count;
  return jsonb_build_object('deactivated', gone, 'purged', old);
end;
$$;
revoke all on function public.finish_scrape(text[], timestamptz) from public, anon, authenticated;

create or replace function public.purge_stale_jobs()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  delete from public.jobs where coalesce(posted_at, first_seen_at) < now() - interval '14 days' or (not is_active and last_seen_at < now() - interval '1 day');
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_stale_jobs() from public, anon, authenticated;

create or replace function public.job_counts()
returns table (country text, total bigint)
language sql stable security definer set search_path = public
as $$
  select country, count(*) from public.jobs where is_active and coalesce(posted_at, first_seen_at) >= now() - interval '14 days' group by country;
$$;

create or replace function public.get_matched_jobs(p_limit integer default 100)
returns table (
  id text, title text, company text, location text, country text, market text, work_mode text, level text, track text,
  url text, posted_at timestamptz, salary_min numeric, salary_max numeric, salary_currency text,
  skills text[], score integer, matched text[], missing text[], locked boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  paid boolean;
  prof jsonb;
  lvls constant text[] := array['apm', 'pm', 'senior', 'lead'];
begin
  if uid is null then return; end if;
  paid := public.has_access(uid);
  select s.profile into prof from public.latest_scan s where s.user_id = uid;

  return query
  with cand as (
    select j.*, extract(epoch from (now() - coalesce(j.posted_at, j.first_seen_at))) / 3600.0 as age_h
    from public.jobs j
    where j.is_active and coalesce(j.posted_at, j.first_seen_at) >= now() - interval '14 days'
  ),
  parts as (
    select c.*,
      array(select k from unnest(c.skills) k where prof is not null and (prof->'skills') ? k) as m_matched,
      array(select k from unnest(c.skills) k where prof is null or not ((prof->'skills') ? k)) as m_missing
    from cand c
  ),
  scored as (
    select p.*,
      case when cardinality(p.skills) = 0 then 0.5 else cardinality(p.m_matched)::numeric / cardinality(p.skills) end as f_skill,
      0.75 * (coalesce((prof->'trackScores'->>p.track)::numeric, case when p.track = 'generalist' then 70 else 50 end) / 100)
        + 0.25 * (case when p.archetype is null then 0.5 when p.archetype = prof->>'archetype' then 1 else 0.5 end) as f_track,
      case
        when p.salary_min is null or prof->'salary' is null or p.salary_currency is distinct from prof->'salary'->>'currency' then 0.5
        when p.salary_max < (prof->'salary'->>'low')::numeric then 0.2
        when p.salary_min > (prof->'salary'->>'high')::numeric then 1
        else 0.75 + 0.25 * least(1, (least(p.salary_max, (prof->'salary'->>'high')::numeric) - greatest(p.salary_min, (prof->'salary'->>'low')::numeric))
                                     / greatest(1, (prof->'salary'->>'high')::numeric - (prof->'salary'->>'low')::numeric))
      end as f_pay,
      case when p.age_h < 24 then 1 when p.age_h < 72 then 0.8 when p.age_h < 168 then 0.55 else 0.3 end as f_fresh,
      case abs(coalesce(array_position(lvls, p.level), 0) - coalesce(array_position(lvls, prof->>'level'), 0))
        when 0 then 1 when 1 then 0.8 else 0.5 end as f_level
    from parts p
  ),
  final as (
    select s.*, case when prof is null then null else round(100 * (0.45 * f_skill + 0.25 * f_track + 0.15 * f_pay + 0.15 * f_fresh) * case when s.level is null then 1 else f_level end)::integer end as pts
    from scored s
  )
  select f.id, f.title, f.company, f.location, f.country, f.market, f.work_mode, f.level, f.track,
         case when paid then f.url else null end,
         coalesce(f.posted_at, f.first_seen_at), f.salary_min, f.salary_max, f.salary_currency,
         f.skills, f.pts, f.m_matched, f.m_missing, not paid
  from final f
  order by f.pts desc nulls last, f.posted_at desc nulls last
  limit case when paid then greatest(1, least(p_limit, 300)) else 3 end;
end;
$$;
revoke all on function public.get_matched_jobs(integer) from public, anon;
grant execute on function public.get_matched_jobs(integer) to authenticated;
