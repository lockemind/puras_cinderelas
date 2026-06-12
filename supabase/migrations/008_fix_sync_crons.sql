-- Fixes for the sync cron jobs (see 005):
--  1. sync-fixtures ran only at midnight UTC — during the tournament the Jogos
--     screen needs fresh scores/status all day. Now every 30 min at :10/:40,
--     offset from sync-results (:00/:30) to spread football-data API calls.
--  2. pg_net's default 5s timeout killed roughly half the calls
--     ("Timeout of 5000 ms reached" in net._http_response). Now 20s.
--  3. Dropped the "Authorization: Bearer <SERVICE_ROLE_KEY>" placeholder header —
--     both functions are deployed with verify_jwt=false and authenticate via
--     x-sync-secret only, so the header was never needed.

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'sync-results-every-30min',
  'sync-fixtures-daily',
  'snapshot-rankings-daily'
);

select cron.schedule(
  'sync-results-every-30min',
  '0,30 * * * *',
  $$
  select net.http_post(
    url     := 'https://vtnwpzdaliqnsmccjaba.supabase.co/functions/v1/sync-results',
    headers := '{"Content-Type": "application/json", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
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
    headers := '{"Content-Type": "application/json", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
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
    headers := '{"Content-Type": "application/json", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
