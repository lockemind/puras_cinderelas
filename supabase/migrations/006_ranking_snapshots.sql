-- Daily ranking snapshots: written each morning at 07:00 UTC (after the last
-- North-America games end) by pg_cron → /api/snapshot-rankings on Vercel.
-- Powers the ▲▼ rank deltas on Classificação and "+n hoje" on Equipa.

create table ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  snapshot_date date not null,
  rank integer not null,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (player_id, snapshot_date)
);

alter table ranking_snapshots disable row level security;
