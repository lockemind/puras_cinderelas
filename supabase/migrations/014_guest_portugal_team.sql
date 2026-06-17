insert into player_teams (player_id, team_id, pot)
select p.id, t.id, 1
from players p
cross join teams t
where p.is_guest
  and t.name = 'Portugal'
  and t.pot = 1
on conflict (player_id, pot) do update
set team_id = excluded.team_id;
