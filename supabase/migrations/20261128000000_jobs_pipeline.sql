-- Job pipeline: categorised postings from company job boards, a tracked-company list, a scrape log and resume-to-job matching.
-- Sources are the public job-board APIs that Greenhouse, Lever and Ashby offer to every customer, so there is no scraping of a site that forbids it.

-- New projects do not grant API roles access to new tables by default: let server code (service role) use everything we create from here on.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

/* ------------------------------------------------------------ companies we pull from */
create table public.tracked_companies (
  id             text primary key,                         -- "greenhouse:stripe"
  ats            text not null check (ats in ('greenhouse', 'lever', 'ashby')),
  token          text not null,                            -- the board slug in the public API
  name           text not null,
  archetype      text check (archetype in ('early_startup', 'scaleup', 'maang', 'enterprise')) default 'scaleup',
  active         boolean not null default true,
  last_run_at    timestamptz,
  last_status    text,
  last_job_count integer,
  unique (ats, token)
);
alter table public.tracked_companies enable row level security; -- no policies: only the server reads or edits this
grant all on public.tracked_companies to service_role;

insert into public.tracked_companies (id, ats, token, name, archetype) values
  ('ashby:1password','ashby','1password','1Password','scaleup'),
  ('ashby:airtable','ashby','airtable','Airtable','scaleup'),
  ('ashby:alchemy','ashby','alchemy','Alchemy','early_startup'),
  ('ashby:amplitude','ashby','amplitude','Amplitude','scaleup'),
  ('ashby:ashby','ashby','ashby','Ashby','early_startup'),
  ('ashby:atlan','ashby','atlan','Atlan','early_startup'),
  ('ashby:baseten','ashby','baseten','Baseten','early_startup'),
  ('ashby:benchling','ashby','benchling','Benchling','early_startup'),
  ('ashby:clerk','ashby','clerk','Clerk','early_startup'),
  ('ashby:cohere','ashby','cohere','Cohere','early_startup'),
  ('ashby:cursor','ashby','cursor','Cursor','early_startup'),
  ('ashby:decagon','ashby','decagon','Decagon','early_startup'),
  ('ashby:deel','ashby','deel','Deel','scaleup'),
  ('ashby:drata','ashby','drata','Drata','scaleup'),
  ('ashby:elevenlabs','ashby','elevenlabs','ElevenLabs','early_startup'),
  ('ashby:fireworks','ashby','fireworks','Fireworks','early_startup'),
  ('ashby:fullstory','ashby','fullstory','FullStory','scaleup'),
  ('ashby:harvey','ashby','harvey','Harvey','early_startup'),
  ('ashby:hex','ashby','hex','Hex','early_startup'),
  ('ashby:kustomer','ashby','kustomer','Kustomer','scaleup'),
  ('ashby:langchain','ashby','langchain','LangChain','early_startup'),
  ('ashby:launchdarkly','ashby','launchdarkly','LaunchDarkly','scaleup'),
  ('ashby:linear','ashby','linear','Linear','early_startup'),
  ('ashby:loom','ashby','loom','Loom','scaleup'),
  ('ashby:mercury','ashby','mercury','Mercury','early_startup'),
  ('ashby:modal','ashby','modal','Modal','early_startup'),
  ('ashby:navi','ashby','navi','Navi','early_startup'),
  ('ashby:notion','ashby','notion','Notion','scaleup'),
  ('ashby:openai','ashby','openai','OpenAI','scaleup'),
  ('ashby:perplexity','ashby','perplexity','Perplexity','early_startup'),
  ('ashby:persona','ashby','persona','Persona','early_startup'),
  ('ashby:pinecone','ashby','pinecone','Pinecone','early_startup'),
  ('ashby:plaid','ashby','plaid','Plaid','scaleup'),
  ('ashby:posthog','ashby','posthog','PostHog','early_startup'),
  ('ashby:pylon','ashby','pylon','Pylon','early_startup'),
  ('ashby:ramp','ashby','ramp','Ramp','scaleup'),
  ('ashby:replit','ashby','replit','Replit','early_startup'),
  ('ashby:runway','ashby','runway','Runway','early_startup'),
  ('ashby:sardine','ashby','sardine','Sardine','early_startup'),
  ('ashby:sarvam','ashby','sarvam','Sarvam AI','early_startup'),
  ('ashby:scaler','ashby','scaler','Scaler','scaleup'),
  ('ashby:sentry','ashby','sentry','Sentry','scaleup'),
  ('ashby:sierra','ashby','sierra','Sierra','early_startup'),
  ('ashby:snyk','ashby','snyk','Snyk','scaleup'),
  ('ashby:stytch','ashby','stytch','Stytch','early_startup'),
  ('ashby:supabase','ashby','supabase','Supabase','early_startup'),
  ('ashby:unit','ashby','unit','Unit','early_startup'),
  ('ashby:vanta','ashby','vanta','Vanta','early_startup'),
  ('ashby:vercel','ashby','vercel','Vercel','scaleup'),
  ('ashby:watershed','ashby','watershed','Watershed','scaleup'),
  ('ashby:weaviate','ashby','weaviate','Weaviate','early_startup'),
  ('ashby:wiz','ashby','wiz','Wiz','scaleup'),
  ('ashby:workos','ashby','workos','WorkOS','early_startup'),
  ('ashby:zapier','ashby','zapier','Zapier','scaleup'),
  ('greenhouse:affirm','greenhouse','affirm','Affirm','scaleup'),
  ('greenhouse:airbnb','greenhouse','airbnb','Airbnb','maang'),
  ('greenhouse:airtable','greenhouse','airtable','Airtable','scaleup'),
  ('greenhouse:anthropic','greenhouse','anthropic','Anthropic','scaleup'),
  ('greenhouse:asana','greenhouse','asana','Asana','enterprise'),
  ('greenhouse:block','greenhouse','block','Block','maang'),
  ('greenhouse:brex','greenhouse','brex','Brex','scaleup'),
  ('greenhouse:carta','greenhouse','carta','Carta','scaleup'),
  ('greenhouse:chime','greenhouse','chime','Chime','scaleup'),
  ('greenhouse:cloudflare','greenhouse','cloudflare','Cloudflare','enterprise'),
  ('greenhouse:coinbase','greenhouse','coinbase','Coinbase','maang'),
  ('greenhouse:databricks','greenhouse','databricks','Databricks','maang'),
  ('greenhouse:datadog','greenhouse','datadog','Datadog','enterprise'),
  ('greenhouse:digit','greenhouse','digit','Digit','scaleup'),
  ('greenhouse:discord','greenhouse','discord','Discord','scaleup'),
  ('greenhouse:dropbox','greenhouse','dropbox','Dropbox','enterprise'),
  ('greenhouse:druva','greenhouse','druva','Druva','enterprise'),
  ('greenhouse:duolingo','greenhouse','duolingo','Duolingo','scaleup'),
  ('greenhouse:elastic','greenhouse','elastic','Elastic','enterprise'),
  ('greenhouse:faire','greenhouse','faire','Faire','scaleup'),
  ('greenhouse:figma','greenhouse','figma','Figma','scaleup'),
  ('greenhouse:fivetran','greenhouse','fivetran','Fivetran','scaleup'),
  ('greenhouse:flexport','greenhouse','flexport','Flexport','scaleup'),
  ('greenhouse:gitlab','greenhouse','gitlab','GitLab','enterprise'),
  ('greenhouse:glance','greenhouse','glance','Glance','early_startup'),
  ('greenhouse:groww','greenhouse','groww','Groww','scaleup'),
  ('greenhouse:gusto','greenhouse','gusto','Gusto','scaleup'),
  ('greenhouse:hubspotjobs','greenhouse','hubspotjobs','HubSpot','scaleup'),
  ('greenhouse:indeed','greenhouse','indeed','Indeed','scaleup'),
  ('greenhouse:inmobi','greenhouse','inmobi','InMobi','scaleup'),
  ('greenhouse:instacart','greenhouse','instacart','Instacart','maang'),
  ('greenhouse:intercom','greenhouse','intercom','Intercom','enterprise'),
  ('greenhouse:lattice','greenhouse','lattice','Lattice','scaleup'),
  ('greenhouse:lyft','greenhouse','lyft','Lyft','maang'),
  ('greenhouse:mixpanel','greenhouse','mixpanel','Mixpanel','scaleup'),
  ('greenhouse:mongodb','greenhouse','mongodb','MongoDB','enterprise'),
  ('greenhouse:naukri','greenhouse','naukri','Naukri','scaleup'),
  ('greenhouse:newrelic','greenhouse','newrelic','New Relic','enterprise'),
  ('greenhouse:observeai','greenhouse','observeai','Observe.AI','early_startup'),
  ('greenhouse:okta','greenhouse','okta','Okta','enterprise'),
  ('greenhouse:pagerduty','greenhouse','pagerduty','PagerDuty','enterprise'),
  ('greenhouse:peloton','greenhouse','peloton','Peloton','scaleup'),
  ('greenhouse:pinterest','greenhouse','pinterest','Pinterest','maang'),
  ('greenhouse:razorpaysoftwareprivatelimited','greenhouse','razorpaysoftwareprivatelimited','Razorpay','scaleup'),
  ('greenhouse:reddit','greenhouse','reddit','Reddit','maang'),
  ('greenhouse:robinhood','greenhouse','robinhood','Robinhood','scaleup'),
  ('greenhouse:roblox','greenhouse','roblox','Roblox','maang'),
  ('greenhouse:samsara','greenhouse','samsara','Samsara','scaleup'),
  ('greenhouse:scaleai','greenhouse','scaleai','Scale AI','early_startup'),
  ('greenhouse:slice','greenhouse','slice','Slice','scaleup'),
  ('greenhouse:sofi','greenhouse','sofi','SoFi','scaleup'),
  ('greenhouse:squarespace','greenhouse','squarespace','Squarespace','enterprise'),
  ('greenhouse:stripe','greenhouse','stripe','Stripe','maang'),
  ('greenhouse:toast','greenhouse','toast','Toast','enterprise'),
  ('greenhouse:twilio','greenhouse','twilio','Twilio','enterprise'),
  ('greenhouse:vercel','greenhouse','vercel','Vercel','scaleup'),
  ('greenhouse:verkada','greenhouse','verkada','Verkada','scaleup'),
  ('greenhouse:webflow','greenhouse','webflow','Webflow','scaleup'),
  ('greenhouse:zscaler','greenhouse','zscaler','Zscaler','enterprise'),
  ('lever:coupa','lever','coupa','Coupa','enterprise'),
  ('lever:cred','lever','cred','CRED','scaleup'),
  ('lever:epifi','lever','epifi','Fi','scaleup'),
  ('lever:fampay','lever','fampay','FamPay','early_startup'),
  ('lever:freshworks','lever','freshworks','Freshworks','enterprise'),
  ('lever:highspot','lever','highspot','Highspot','scaleup'),
  ('lever:meesho','lever','meesho','Meesho','scaleup'),
  ('lever:mindtickle','lever','mindtickle','Mindtickle','scaleup'),
  ('lever:outreach','lever','outreach','Outreach','scaleup'),
  ('lever:palantir','lever','palantir','Palantir','scaleup'),
  ('lever:paytm','lever','paytm','Paytm','scaleup'),
  ('lever:pocketfm','lever','pocketfm','Pocket FM','early_startup'),
  ('lever:spotify','lever','spotify','Spotify','maang'),
  ('lever:wealthfront','lever','wealthfront','Wealthfront','scaleup'),
  ('lever:zeta','lever','zeta','Zeta','scaleup')
on conflict (id) do nothing;

/* ------------------------------------------------------------ jobs: categories, skills, pay, lifecycle */
alter table public.jobs
  add column company_id      text references public.tracked_companies(id) on delete set null,
  add column market          text check (market in ('india', 'us', 'remote_global')),
  add column track           text check (track in ('generalist', 'ai_ml', 'growth_plg', 'b2b_saas', 'platform_api', 'fintech')),
  add column archetype       text check (archetype in ('early_startup', 'scaleup', 'maang', 'enterprise')),
  add column skills          text[] not null default '{}',
  add column years_required  integer,
  add column salary_min      numeric,
  add column salary_max      numeric,
  add column salary_currency text check (salary_currency in ('INR', 'USD')),
  add column department      text,
  add column description     text,
  add column posted_at       timestamptz,
  add column first_seen_at   timestamptz not null default now(),
  add column last_seen_at    timestamptz not null default now(),
  add column is_active       boolean not null default true;

create index jobs_active_posted on public.jobs (is_active, posted_at desc);
create index jobs_company on public.jobs (company_id);

-- The feed is the last 72 hours of active postings. Replace the older one-day rule.
drop policy if exists "paid read fresh jobs" on public.jobs;
create policy "paid read fresh jobs" on public.jobs for select to authenticated
  using (public.has_access(auth.uid()) and is_active and coalesce(posted_at, first_seen_at) >= now() - interval '72 hours');

/* ------------------------------------------------------------ a log of every scrape */
create table public.scrape_runs (
  id               bigint generated always as identity primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  companies_total  integer,
  companies_ok     integer,
  companies_failed integer,
  jobs_seen        integer,
  jobs_stored      integer,
  deactivated      integer,
  purged           integer,
  partial          boolean not null default false,
  errors           jsonb not null default '[]'::jsonb
);
alter table public.scrape_runs enable row level security;
grant all on public.scrape_runs to service_role;

/* ------------------------------------------------------------ the resume side of matching */
alter table public.latest_scan add column profile jsonb; -- skills, level, track scores, market, pay band: see profileFromReport() in the ATS engine

/* ------------------------------------------------------------ lifecycle helpers (server only) */
create or replace function public.finish_scrape(ok_companies text[], run_started timestamptz)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare gone integer; old integer;
begin
  -- A posting that vanished from a board we read successfully has been closed or filled.
  update public.jobs set is_active = false
    where is_active and company_id = any(ok_companies) and last_seen_at < run_started;
  get diagnostics gone = row_count;
  -- Past the freshness window, or closed for a day: remove.
  delete from public.jobs
    where coalesce(posted_at, first_seen_at) < now() - interval '72 hours' or (not is_active and last_seen_at < now() - interval '1 day');
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
  delete from public.jobs where coalesce(posted_at, first_seen_at) < now() - interval '72 hours' or (not is_active and last_seen_at < now() - interval '1 day');
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_stale_jobs() from public, anon, authenticated;

create or replace function public.job_counts()
returns table (country text, total bigint)
language sql stable security definer set search_path = public
as $$
  select country, count(*) from public.jobs where is_active and coalesce(posted_at, first_seen_at) >= now() - interval '72 hours' group by country;
$$;

/* ------------------------------------------------------------ matching */
-- Mirrors scoreMatch() in packages/ats-engine-v2/src/engine/jobs.ts. Keep the two in step.
--   score = round(100 * (0.45 skills + 0.25 track + 0.15 pay + 0.15 freshness) * levelFactor)
-- Free accounts see their top 3 matches without links; paid accounts see everything.
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
    where j.is_active and coalesce(j.posted_at, j.first_seen_at) >= now() - interval '72 hours'
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
      case when p.age_h < 24 then 1 when p.age_h < 48 then 0.75 when p.age_h < 72 then 0.5 else 0.3 end as f_fresh,
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
