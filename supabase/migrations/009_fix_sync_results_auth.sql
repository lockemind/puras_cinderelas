-- sync-results edge function has verify_jwt=true (unlike sync-fixtures),
-- so the cron must include the service-role JWT. Migration 008 removed it
-- under the wrong assumption both functions had verify_jwt=false.

select cron.unschedule('sync-results-every-30min');

select cron.schedule(
  'sync-results-every-30min',
  '0,30 * * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-results',
    headers := '{"Content-Type": "application/json", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bndwemRhbGlxbnNtY2NqYWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NTE1NiwiZXhwIjoyMDk2MjQxMTU2fQ.kVaBcD1zXabba-ECuVyQgrkYz25i5Zq6jzyfJmFnaA4"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
