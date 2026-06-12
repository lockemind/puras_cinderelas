-- Apply ONLY after app/api/snapshot-rankings is deployed to production.
-- 07:00 UTC = after the last US-west-coast games finish (~06:30 UTC),
-- before Lisbon players wake up.

select cron.unschedule(jobname)
from cron.job
where jobname = 'snapshot-rankings-daily';

select cron.schedule(
  'snapshot-rankings-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://puras-cinderelas.vercel.app/api/snapshot-rankings',
    headers := '{"Content-Type": "application/json", "x-sync-secret": "2c232e38622d2414a08d1ff3216bc5b467b6759293c0095fbd28311e39bb494c"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
