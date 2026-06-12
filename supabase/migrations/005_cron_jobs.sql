-- pg_cron and pg_net are already enabled on this project; these are no-ops if run again
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Remove existing jobs if they exist (makes this migration safe to re-run)
select cron.unschedule(jobname)
from cron.job
where jobname in ('sync-results-every-30min', 'sync-fixtures-daily');

-- Sync results every 30 minutes.
-- Replace <SERVICE_ROLE_KEY> with the value from Supabase Dashboard → Settings → API.
select cron.schedule(
  'sync-results-every-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-results',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Sync fixtures once per day (midnight UTC) to keep the match schedule up to date
select cron.schedule(
  'sync-fixtures-daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-fixtures',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
