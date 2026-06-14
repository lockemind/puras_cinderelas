-- sync-results now uses verify_jwt=false (like sync-fixtures),
-- so the Authorization header is no longer needed.
-- Also remove the unused service_role_key vault entry.

select cron.unschedule('sync-results-every-30min');

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

delete from vault.secrets where name = 'service_role_key';
