-- Pote 1 (favourites + hosts)
insert into teams (name, pot, flag_emoji) values
  ('Canadá', 1, '🇨🇦'),
  ('México', 1, '🇲🇽'),
  ('Estados Unidos', 1, '🇺🇸'),
  ('Espanha', 1, '🇪🇸'),
  ('Argentina', 1, '🇦🇷'),
  ('França', 1, '🇫🇷'),
  ('Inglaterra', 1, '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Brasil', 1, '🇧🇷'),
  ('Portugal', 1, '🇵🇹'),
  ('Países Baixos', 1, '🇳🇱'),
  ('Bélgica', 1, '🇧🇪'),
  ('Alemanha', 1, '🇩🇪');

-- Pote 2
insert into teams (name, pot, flag_emoji) values
  ('Croácia', 2, '🇭🇷'),
  ('Marrocos', 2, '🇲🇦'),
  ('Colômbia', 2, '🇨🇴'),
  ('Uruguai', 2, '🇺🇾'),
  ('Suíça', 2, '🇨🇭'),
  ('Japão', 2, '🇯🇵'),
  ('Senegal', 2, '🇸🇳'),
  ('Irão', 2, '🇮🇷'),
  ('Coreia do Sul', 2, '🇰🇷'),
  ('Equador', 2, '🇪🇨'),
  ('Áustria', 2, '🇦🇹'),
  ('Austrália', 2, '🇦🇺');

-- Pote 3
insert into teams (name, pot, flag_emoji) values
  ('Noruega', 3, '🇳🇴'),
  ('Panamá', 3, '🇵🇦'),
  ('Egito', 3, '🇪🇬'),
  ('Argélia', 3, '🇩🇿'),
  ('Escócia', 3, '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  ('Paraguai', 3, '🇵🇾'),
  ('Tunísia', 3, '🇹🇳'),
  ('Costa do Marfim', 3, '🇨🇮'),
  ('Uzbequistão', 3, '🇺🇿'),
  ('Qatar', 3, '🇶🇦'),
  ('Arábia Saudita', 3, '🇸🇦'),
  ('África do Sul', 3, '🇿🇦');

-- Pote 4
insert into teams (name, pot, flag_emoji) values
  ('Jordânia', 4, '🇯🇴'),
  ('Cabo Verde', 4, '🇨🇻'),
  ('Gana', 4, '🇬🇭'),
  ('Curaçau', 4, '🇨🇼'),
  ('Haiti', 4, '🇭🇹'),
  ('Nova Zelândia', 4, '🇳🇿'),
  ('Bósnia e Herzegovina', 4, '🇧🇦'),
  ('Suécia', 4, '🇸🇪'),
  ('Turquia', 4, '🇹🇷'),
  ('Chéquia', 4, '🇨🇿'),
  ('República Democrática do Congo', 4, '🇨🇩'),
  ('Iraque', 4, '🇮🇶');

-- Initialise team_progress for all teams
insert into team_progress (team_id)
select id from teams;
