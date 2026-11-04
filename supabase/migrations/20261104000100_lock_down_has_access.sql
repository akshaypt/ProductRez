-- has_access is only needed by RLS policies (authenticated) and edge functions (service_role).
-- Anonymous callers have no policies and no reason to probe entitlements.
-- (job_counts() stays callable by anon on purpose: it is the public "fresh jobs" teaser.)
revoke execute on function public.has_access(uuid) from public, anon;
grant execute on function public.has_access(uuid) to authenticated, service_role;
