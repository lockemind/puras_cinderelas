-- Competition singleton (always id = 1)
create table competition (
  id integer primary key default 1 check (id = 1),
  status text not null default 'setup'
    check (status in ('setup', 'draft', 'locked', 'running', 'finished')),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into competition (id) values (1);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- Teams (all 48 World Cup nations)
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pot integer not null check (pot between 1 and 4),
  flag_emoji text not null default '',
  api_id integer,  -- football-data.org numeric team ID
  created_at timestamptz not null default now()
);

-- Team assignments per player (one per pot)
create table player_teams (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  pot integer not null check (pot between 1 and 4),
  unique (player_id, pot)
);

-- Team progress (updated by admin or auto-sync)
create table team_progress (
  team_id uuid primary key references teams(id) on delete cascade,
  group_wins integer not null default 0,
  group_draws integer not null default 0,
  stage_reached text not null default 'group_stage'
    check (stage_reached in ('group_stage', 'r32', 'r16', 'qf', 'sf', 'final', 'champion')),
  is_champion boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Score audit log
create table score_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  reason text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

-- Private app: disable RLS (service role key used server-side only)
alter table competition disable row level security;
alter table players disable row level security;
alter table teams disable row level security;
alter table player_teams disable row level security;
alter table team_progress disable row level security;
alter table score_entries disable row level security;
