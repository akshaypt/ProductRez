-- ProductRez core schema. Paywall is enforced here (RLS), not only in the UI.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- entitlements
create table public.entitlements (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null check (plan in ('month', 'six_months', 'lifetime')),
  lifetime   boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.has_access(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid and (e.lifetime or e.expires_at > now())
  );
$$;

-- ---------------------------------------------------------------- payments
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan                 text not null check (plan in ('month', 'six_months', 'lifetime')),
  amount_paise         integer not null,
  currency             text not null default 'INR',
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text unique,
  status               text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at           timestamptz not null default now()
);

-- Grants a plan. Stacks on top of any remaining time. Idempotent per payment id.
create or replace function public.grant_plan(p_user uuid, p_plan text, p_order text, p_payment text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  cur public.entitlements;
  base timestamptz;
  add_interval interval;
begin
  if exists (select 1 from public.payments where razorpay_payment_id = p_payment and status = 'paid') then
    return;
  end if;

  update public.payments
     set status = 'paid', razorpay_payment_id = p_payment
   where razorpay_order_id = p_order and user_id = p_user;

  select * into cur from public.entitlements where user_id = p_user;

  if p_plan = 'lifetime' then
    insert into public.entitlements (user_id, plan, lifetime, expires_at)
    values (p_user, 'lifetime', true, null)
    on conflict (user_id) do update set plan = 'lifetime', lifetime = true, expires_at = null, updated_at = now();
    return;
  end if;

  if cur.lifetime then return; end if; -- already forever
  add_interval := case p_plan when 'month' then interval '30 days' else interval '182 days' end;
  base := greatest(coalesce(cur.expires_at, now()), now());
  insert into public.entitlements (user_id, plan, lifetime, expires_at)
  values (p_user, p_plan, false, base + add_interval)
  on conflict (user_id) do update set plan = excluded.plan, expires_at = excluded.expires_at, updated_at = now();
end;
$$;
revoke all on function public.grant_plan(uuid, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- resume scoring quota
create table public.score_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  overall    integer,
  report     jsonb,
  created_at timestamptz not null default now()
);
create index on public.score_usage (user_id, created_at desc);

-- Atomically decide whether this user may score. Free accounts get exactly one.
create or replace function public.consume_score(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare used integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  if public.has_access(p_user) then return true; end if;
  select count(*) into used from public.score_usage where user_id = p_user;
  return used < 1;
end;
$$;
revoke all on function public.consume_score(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- saved resumes (writer)
create table public.resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled resume',
  template   text not null default 'ledger',
  options    jsonb not null default '{}'::jsonb,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index on public.resumes (user_id, updated_at desc);

-- ---------------------------------------------------------------- jobs (scraped daily)
create table public.jobs (
  id         text primary key,                 -- LinkedIn job id
  title      text not null,
  company    text not null,
  location   text not null default '',
  country    text not null check (country in ('US', 'IN', 'OTHER')),
  work_mode  text check (work_mode in ('remote', 'hybrid', 'onsite')),
  level      text check (level in ('apm', 'pm', 'senior', 'lead')),
  url        text not null,
  posted_on  date not null,
  source     text not null default 'linkedin',
  fetched_at timestamptz not null default now()
);
create index on public.jobs (posted_on desc, country);

create table public.saved_jobs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_id     text not null,
  job        jsonb not null,                    -- snapshot, survives the 2-day purge
  status     text not null default 'saved' check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- Public teaser: counts only, so logged-out and free users can see what they're missing.
create or replace function public.job_counts()
returns table (country text, total bigint)
language sql stable security definer set search_path = public
as $$
  select country, count(*) from public.jobs where posted_on >= current_date - 1 group by country;
$$;
grant execute on function public.job_counts() to anon, authenticated;

-- ---------------------------------------------------------------- resources
create table public.resources (
  id          text primary key,
  title       text not null,
  url         text not null,
  source      text not null,
  kind        text not null check (kind in ('video', 'article', 'newsletter', 'podcast', 'book', 'course', 'tool', 'template')),
  topics      text[] not null default '{}',
  level       text not null check (level in ('beginner', 'intermediate', 'advanced')),
  minutes     integer,
  why         text not null,
  free        boolean not null default true,
  position    integer not null default 0
);

create table public.learning_paths (
  id       text primary key,
  title    text not null,
  blurb    text not null,
  weeks    integer not null,
  steps    jsonb not null,                      -- [{week, title, resource_ids[]}]
  position integer not null default 0
);

create table public.resource_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  resource_id text not null,
  done        boolean not null default false,
  bookmarked  boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- ---------------------------------------------------------------- RLS
alter table public.entitlements       enable row level security;
alter table public.payments           enable row level security;
alter table public.score_usage        enable row level security;
alter table public.resumes            enable row level security;
alter table public.jobs               enable row level security;
alter table public.saved_jobs         enable row level security;
alter table public.resources          enable row level security;
alter table public.learning_paths     enable row level security;
alter table public.resource_progress  enable row level security;

create policy "own entitlement"   on public.entitlements for select to authenticated using (user_id = auth.uid());
create policy "own payments"      on public.payments     for select to authenticated using (user_id = auth.uid());
create policy "own score history" on public.score_usage  for select to authenticated using (user_id = auth.uid());

-- Resumes are a paid feature.
create policy "paid read resumes"   on public.resumes for select to authenticated using (user_id = auth.uid() and public.has_access(auth.uid()));
create policy "paid insert resumes" on public.resumes for insert to authenticated with check (user_id = auth.uid() and public.has_access(auth.uid()));
create policy "paid update resumes" on public.resumes for update to authenticated using (user_id = auth.uid() and public.has_access(auth.uid()));
create policy "paid delete resumes" on public.resumes for delete to authenticated using (user_id = auth.uid());

-- Jobs: paid users see only jobs posted today or yesterday (the "last 2 days" window).
create policy "paid read fresh jobs" on public.jobs for select to authenticated
  using (public.has_access(auth.uid()) and posted_on >= current_date - 1);

create policy "paid manage saved jobs" on public.saved_jobs for all to authenticated
  using (user_id = auth.uid() and public.has_access(auth.uid()))
  with check (user_id = auth.uid() and public.has_access(auth.uid()));

create policy "paid read resources" on public.resources       for select to authenticated using (public.has_access(auth.uid()));
create policy "paid read paths"     on public.learning_paths  for select to authenticated using (public.has_access(auth.uid()));
create policy "paid own progress"   on public.resource_progress for all to authenticated
  using (user_id = auth.uid() and public.has_access(auth.uid()))
  with check (user_id = auth.uid() and public.has_access(auth.uid()));

-- Housekeeping: called by the daily job after a successful scrape.
create or replace function public.purge_stale_jobs()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  delete from public.jobs where posted_on < current_date - 1;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_stale_jobs() from public, anon, authenticated;
