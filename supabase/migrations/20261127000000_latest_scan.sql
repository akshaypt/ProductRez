-- The latest resume check for each account. One row per user: a new upload replaces the previous one.
-- Holds the parsed resume (inside the report), the v2 score report and the level/focus/company picks. No raw file is stored.
create table public.latest_scan (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  file_name  text not null default 'resume',
  picks      jsonb not null default '{}'::jsonb,
  report     jsonb not null,
  updated_at timestamptz not null default now(),
  constraint latest_scan_bounds check (
    length(file_name) < 200 and pg_column_size(picks) < 4000 and pg_column_size(report) < 400000
  )
);

alter table public.latest_scan enable row level security;

-- Free for every signed-in user (unlike Writer resumes), but only ever their own row.
create policy "own scan read"   on public.latest_scan for select to authenticated using (user_id = auth.uid());
create policy "own scan insert" on public.latest_scan for insert to authenticated with check (user_id = auth.uid());
create policy "own scan update" on public.latest_scan for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scan delete" on public.latest_scan for delete to authenticated using (user_id = auth.uid());
