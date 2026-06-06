-- supabase/migrations/004_mascots.sql
alter table teams add column mascot text;

-- Pot 1
update teams set mascot = 'alemanha'        where name = 'Alemanha';
update teams set mascot = 'argentina'       where name = 'Argentina';
update teams set mascot = 'belgica'         where name = 'Bélgica';
update teams set mascot = 'brasil'          where name = 'Brasil';
update teams set mascot = 'canada'          where name = 'Canadá';
update teams set mascot = 'espanha'         where name = 'Espanha';
update teams set mascot = 'franca'          where name = 'França';
update teams set mascot = 'inglaterra'      where name = 'Inglaterra';
update teams set mascot = 'mexico'          where name = 'México';
update teams set mascot = 'paises-baixos'   where name = 'Países Baixos';
update teams set mascot = 'portugal'        where name = 'Portugal';
update teams set mascot = 'usa'             where name = 'Estados Unidos';

-- Pot 2
update teams set mascot = 'croacia'         where name = 'Croácia';
update teams set mascot = 'marrocos'        where name = 'Marrocos';
update teams set mascot = 'colombia'        where name = 'Colômbia';
update teams set mascot = 'uruguai'         where name = 'Uruguai';
update teams set mascot = 'suica'           where name = 'Suíça';
update teams set mascot = 'japao'           where name = 'Japão';
update teams set mascot = 'senegal'         where name = 'Senegal';
update teams set mascot = 'irao'            where name = 'Irão';
update teams set mascot = 'coreia_do_sul'   where name = 'Coreia do Sul';
update teams set mascot = 'equador'         where name = 'Equador';
update teams set mascot = 'austria'         where name = 'Áustria';
update teams set mascot = 'australia'       where name = 'Austrália';

-- Pot 3
update teams set mascot = 'noruega'         where name = 'Noruega';
update teams set mascot = 'panama'          where name = 'Panamá';
update teams set mascot = 'egipto'          where name = 'Egito';
update teams set mascot = 'algeria'         where name = 'Argélia';
update teams set mascot = 'escocia'         where name = 'Escócia';
update teams set mascot = 'paraguai'        where name = 'Paraguai';
update teams set mascot = 'tunisia'         where name = 'Tunísia';
update teams set mascot = 'costa_do_marfim' where name = 'Costa do Marfim';
update teams set mascot = 'uzbequistao'     where name = 'Uzbequistão';
update teams set mascot = 'qatar'           where name = 'Qatar';
update teams set mascot = 'arabia_saudita'  where name = 'Arábia Saudita';
update teams set mascot = 'africa_do_sul'   where name = 'África do Sul';

-- Pot 4
update teams set mascot = 'jordania'        where name = 'Jordânia';
update teams set mascot = 'cabo_verde'      where name = 'Cabo Verde';
update teams set mascot = 'gana'            where name = 'Gana';
update teams set mascot = 'curacao'         where name = 'Curaçau';
update teams set mascot = 'haiti'           where name = 'Haiti';
update teams set mascot = 'nova_zelandia'   where name = 'Nova Zelândia';
update teams set mascot = 'bosnia'          where name = 'Bósnia e Herzegovina';
update teams set mascot = 'suecia'          where name = 'Suécia';
update teams set mascot = 'turquia'         where name = 'Turquia';
update teams set mascot = 'chequia'         where name = 'Chéquia';
update teams set mascot = 'congo'           where name = 'República Democrática do Congo';
update teams set mascot = 'iraq'            where name = 'Iraque';
