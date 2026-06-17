alter table players
add column is_guest boolean not null default false;

create unique index players_single_guest_idx
on players (is_guest)
where is_guest;
