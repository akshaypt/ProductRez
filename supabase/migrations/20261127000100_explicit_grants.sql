-- Newer Supabase projects do not give the API roles access to new tables by default.
-- Grant exactly what each table's row-level-security policies already intend, and nothing wider.
-- anon (signed-out) gets nothing: the landing page reads no tables, and job_counts() has its own grant.

-- Server side (edge functions use the service role): full access.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Signed-in users: read their own rows.
grant select on public.entitlements, public.payments, public.score_usage to authenticated;
-- Paid features (the policies check has_access()).
grant select, insert, update, delete on public.resumes, public.saved_jobs, public.resource_progress to authenticated;
grant select on public.jobs, public.resources, public.learning_paths to authenticated;
-- The latest resume check: free for every signed-in user, own row only.
grant select, insert, update, delete on public.latest_scan to authenticated;
