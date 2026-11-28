-- Every resume check is kept as data, including checks made before anyone signs in. The Terms and Privacy pages say so, and the
-- Review button shows a notice. Used to improve scoring, to build PM benchmarks, and to contact people about their resume.
-- Nobody can read this table from the app: it has no policies, only the service role (edge functions) can touch it.
create table if not exists public.resume_submissions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  anon_id       uuid not null,                       -- per-browser id, ties pre-sign-in checks to the account later
  user_id       uuid references auth.users(id) on delete set null,
  account_email text,                                -- the email they signed in with, once known
  email         text,                                -- contact details read from the resume
  phone         text,
  full_name     text,
  location      text,
  linkedin      text,
  resume        jsonb not null,                      -- the parsed resume (engine ResumeData)
  scores        jsonb not null,                      -- overall, dimensions, level, track, stats, currency
  picks         jsonb,
  source        text not null default 'landing' check (source in ('landing', 'app')),
  engine_version int not null default 2,
  terms_version text not null,
  unsubscribed_at timestamptz,                       -- set when the person opts out of emails
  constraint resume_size check (pg_column_size(resume) < 400000)
);
alter table public.resume_submissions enable row level security;
create index if not exists resume_submissions_anon on public.resume_submissions (anon_id, created_at desc);
create index if not exists resume_submissions_user on public.resume_submissions (user_id) where user_id is not null;
create index if not exists resume_submissions_email on public.resume_submissions (lower(email)) where email is not null;
revoke all on public.resume_submissions from anon, authenticated;
grant all on public.resume_submissions to service_role;
