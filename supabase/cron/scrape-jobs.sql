-- Schedules the daily job scrape. Run once per project (it is not a migration, because it names the project's URL).
--   1. Set the function secret:  supabase secrets set CRON_SECRET=<random>   (or POST /v1/projects/<ref>/secrets)
--   2. Store the same value for the scheduler:  select vault.create_secret('<same random>', 'cron_secret');
--   3. Replace <PROJECT_REF> below and run this file.
-- 01:30 UTC is 7:00 AM IST; 13:30 UTC catches the US morning. Check the runs in public.scrape_runs.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('scrape-jobs') where exists (select 1 from cron.job where jobname = 'scrape-jobs');
select cron.schedule('scrape-jobs', '30 1,13 * * *', $cron$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scrape-jobs',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
