-- Current and expected pay for each account, kept apart from the resume check so a new upload does not erase it.
-- INR is stored in lakhs per year (CTC) and USD in thousands per year, the units the score report uses.
-- Only the owner can read or change their row.
create table if not exists public.user_pay (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  currency        text not null check (currency in ('INR', 'USD')),
  current_amount  numeric(10, 2) check (current_amount  is null or (current_amount  > 0 and current_amount  <= 10000)),
  expected_amount numeric(10, 2) check (expected_amount is null or (expected_amount > 0 and expected_amount <= 10000)),
  updated_at      timestamptz not null default now()
);

alter table public.user_pay enable row level security;

drop policy if exists "own pay read"   on public.user_pay;
drop policy if exists "own pay insert" on public.user_pay;
drop policy if exists "own pay update" on public.user_pay;
drop policy if exists "own pay delete" on public.user_pay;
create policy "own pay read"   on public.user_pay for select to authenticated using (user_id = (select auth.uid()));
create policy "own pay insert" on public.user_pay for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own pay update" on public.user_pay for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own pay delete" on public.user_pay for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.user_pay from anon;
grant select, insert, update, delete on public.user_pay to authenticated;
grant all on public.user_pay to service_role;
revoke truncate, references, trigger on public.user_pay from authenticated;
