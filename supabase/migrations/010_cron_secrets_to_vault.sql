-- Move hardcoded secrets out of cron job SQL into Supabase Vault.
-- After running this migration, set the real value in the Supabase dashboard:
--   Database → Vault → sync_secret

-- 1. Seed vault entry (empty — you MUST set the real value via dashboard)
select vault.create_secret('REPLACE_ME', 'sync_secret', 'x-sync-secret header for cron→edge-function auth');

-- 2. Recreate every cron job so headers are built at runtime from vault

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'sync-results-every-30min',
  'sync-fixtures-every-30min',
  'snapshot-rankings-daily'
);

select cron.schedule(
  'sync-results-every-30min',
  '0,30 * * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

select cron.schedule(
  'sync-fixtures-every-30min',
  '10,40 * * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-fixtures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

select cron.schedule(
  'snapshot-rankings-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://puras-cinderelas.vercel.app/api/snapshot-rankings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
