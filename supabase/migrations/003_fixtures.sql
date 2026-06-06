-- Fixtures table for World Cup matches
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  api_id integer unique not null,
  stage text not null,
  "group" text,
  utc_date timestamptz not null,
  status text not null,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  home_score integer,
  away_score integer,
  updated_at timestamptz not null default now()
);

alter table fixtures disable row level security;
