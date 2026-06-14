-- Supabase API gateway requires an Authorization header even when
-- verify_jwt=false. Use the publishable (anon) key from vault.

select vault.create_secret('REPLACE_ME', 'anon_key', 'Supabase publishable key for API gateway auth');

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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
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
