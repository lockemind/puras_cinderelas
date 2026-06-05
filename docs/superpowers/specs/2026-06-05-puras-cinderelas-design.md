# Puras Cinderelas 2026 — Design Document

_Data: 2026-06-05_

---

## Visão Geral

Aplicação web privada para gerir a competição de prognósticos "Puras Cinderelas 2026", baseada no Mundial FIFA 2026. 12 participantes constroem uma equipa virtual com 4 seleções nacionais (uma por pote) e acumulam pontos conforme os resultados do torneio.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Estilos | Tailwind CSS, shadcn/ui |
| Backend | Next.js Server Actions |
| Base de Dados | Supabase (PostgreSQL) |
| Sync de Resultados | Supabase Edge Function + pg_cron |
| API de Resultados | football-data.org (tier gratuito) |
| Hosting | Vercel (Hobby) |

---

## Arquitetura

### Rotas

```
/                        → Página pública: estado da competição + classificação
/play/[token]            → Área do jogador (equipa + escolhas + classificação)
/admin                   → Painel de administração (protegido por token)
```

### Autenticação

- **Jogadores:** acesso via link privado `/play/[token]` — o token está em `players.access_token`
- **Admin:** acesso via `/admin?token=ADMIN_SECRET` — `ADMIN_SECRET` é uma variável de ambiente no Vercel. Token ausente ou inválido redireciona para `/`.
- Sem cookies nem sessões — stateless.

### Mutações

Todas as mutações são geridas por **Next.js Server Actions**. Sem endpoints de API manuais.

---

## Modelo de Dados

### `competition` _(singleton — uma linha, id = 1)_

| Campo | Tipo | Notas |
|---|---|---|
| id | integer | sempre 1 |
| status | enum | `setup \| draft \| locked \| running \| finished` |
| last_synced_at | timestamp | último sync automático bem-sucedido |
| updated_at | timestamp | |

### `players`

| Campo | Tipo |
|---|---|
| id | uuid |
| name | text |
| access_token | text |
| created_at | timestamp |

### `teams`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| name | text | nome em português |
| pot | integer | 1–4 |
| flag_emoji | text | ex: 🇵🇹 |
| api_id | integer | ID numérico da football-data.org |
| created_at | timestamp | |

### `player_teams`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| player_id | uuid | FK → players |
| team_id | uuid | FK → teams |
| pot | integer | 1–4 |

**Regras:**
- Um jogador tem exatamente uma entrada por pote (1 a 4).
- O Pote 1 só pode ser preenchido via sorteio (Server Action exclusiva do admin).
- Os Potes 2, 3 e 4 são preenchidos pelo próprio jogador durante o estado `draft`.
- Equipas dos Potes 2, 3 e 4 podem repetir-se entre jogadores.

### `team_progress`

| Campo | Tipo | Notas |
|---|---|---|
| team_id | uuid | PK, FK → teams |
| group_wins | integer | vitórias na fase de grupos |
| group_draws | integer | empates na fase de grupos |
| stage_reached | enum | ver mapeamento abaixo |
| is_champion | boolean | |
| updated_at | timestamp | |

**Mapeamento `stage_reached`:**

| Valor enum | Descrição (PT) | Fase do Mundial 2026 |
|---|---|---|
| `group_stage` | Fase de grupos | Eliminado na fase de grupos |
| `r32` | 1/16 de final | Ronda de 32 (primeiro knockout) |
| `r16` | 1/8 de final | Ronda de 16 |
| `qf` | Quartos de final | Quartos de final |
| `sf` | Meia-final | Meia-final |
| `final` | Final | Final |
| `champion` | Campeão Mundial | Vencedor do torneio |

### `score_entries` _(auditoria opcional)_

| Campo | Tipo |
|---|---|
| id | uuid |
| player_id | uuid |
| team_id | uuid |
| reason | text |
| points | integer |
| created_at | timestamp |

---

## Sistema de Pontuação

A pontuação é **calculada on-the-fly** a partir de `player_teams` + `team_progress`. Não é armazenada. `score_entries` serve apenas para auditoria.

### Fase de Grupos

```
vitórias × 3 + empates × 1
```

### Fase a Eliminar

| Fase | Pontos |
|---|---|
| Vitória nos 1/16 de final | +5 |
| Vitória nos 1/8 de final | +8 |
| Vitória nos quartos de final | +12 |
| Vitória na meia-final | +15 |
| Campeão Mundial | +25 |

### Bónus Cinderela — Pote 3

Os bónus são **cumulativos**: uma equipa que chegue à Final recebe +3 +7 +10 = +20 total.

| Fase alcançada | Bónus adicional | Total acumulado |
|---|---|---|
| Quartos de final | +3 | +3 |
| Meia-final | +7 | +10 |
| Final | +10 | +20 |
| Campeão Mundial | +15 | +35 |

### Bónus Cinderela — Pote 4

Os bónus são **cumulativos**: uma equipa campeã do Pote 4 acumula +5 +10 +15 +20 = +50 de bónus total.

| Fase alcançada | Bónus adicional | Total acumulado |
|---|---|---|
| Quartos de final | +5 | +5 |
| Meia-final | +10 | +15 |
| Final | +15 | +30 |
| Campeão Mundial | +20 | +50 |

### Critérios de Desempate

1. Maior número de campeões mundiais
2. Maior número de finalistas
3. Maior número de meias-finais
4. Maior número de quartos de final
5. Sorteio

---

## Estados da Competição

```
setup → draft → locked → running → finished
```

| Estado | O que é permitido |
|---|---|
| **setup** | Admin cria jogadores e configura equipas |
| **draft** | Sorteio do Pote 1 executado; jogadores escolhem Potes 2/3/4 |
| **locked** | Escolhas encerradas; apenas consulta |
| **running** | Mundial a decorrer; sync automático ativo; admin pode atualizar resultados |
| **finished** | Competição terminada; classificação final congelada |

---

## Páginas da Aplicação

### `/` — Página Pública

- Estado atual da competição
- Classificação completa com pontos de todos os jogadores
- Indicador "🔄 Próxima atualização em X min" (calculado a partir de `last_synced_at + 30 min`)
- Durante `setup`/`draft`: mensagem de "a preparar"
- Acessível sem autenticação

### `/play/[token]` — Área do Jogador

Navegação por tab bar no fundo (mobile-first). Três tabs:

**Tab 1 — A minha equipa**
- Estado `draft`: mostra Pote 1 (atribuído por sorteio) + seletores para Potes 2, 3 e 4
- Estado `running`/`locked`/`finished`: mostra as 4 seleções, cada uma num card expansível com:
  - Fase alcançada e pontuação total da equipa
  - Breakdown detalhado da origem dos pontos:
    - Fase de grupos: `X vitórias × 3 + Y empates = Z pts`
    - Knockout: `+5 (1/16) + +8 (1/8) + ...` conforme fase alcançada
    - Bónus Cinderela: `+3 (QF) + +7 (SF) + ...` (apenas Potes 3 e 4)
  - O breakdown é calculado on-the-fly a partir de `team_progress` — sem dados extra na BD

**Tab 2 — Classificação**
- Tabela global com posição, nome e pontuação de todos os jogadores
- Clicar numa linha expande o detalhe: 4 equipas desse jogador com pontuação de cada uma
- Indicador "Próxima atualização em X min"

**Tab 3 — Seleções**
- Lista todas as equipas agrupadas por pote
- Fase alcançada + pontos atuais de cada equipa

### `/admin` — Painel de Administração

Protegido por `?token=ADMIN_SECRET`. Secções:

1. **Estado** — botão para avançar a competição entre estados; mostra estado atual
2. **Jogadores** — criar jogadores, listar participantes com link privado de cada um
3. **Sorteio** — botão "Executar Sorteio do Pote 1" (disponível apenas em `draft`; desativa-se após execução)
4. **Resultados** — tabela de todas as equipas com edição inline de `group_wins`, `group_draws`, `stage_reached`; botão "Sincronizar agora" para sync manual on-demand
5. **Estado do Sync** — última sincronização bem-sucedida, indicador de falha (ex: "⚠️ Último sync falhou às 15:32 — sincroniza manualmente")

---

## Sync Automático de Resultados

### football-data.org

- API gratuita, sem cartão de crédito
- Cobre o Mundial FIFA 2026
- Limite: 10 chamadas/min no tier gratuito
- Autenticação via header `X-Auth-Token`
- O campo `teams.api_id` mapeia cada seleção ao ID numérico da API

### Supabase Edge Function — `sync-results`

Fluxo de execução:

1. Chama football-data.org para obter os jogos do Mundial 2026
2. Filtra jogos com status `FINISHED`
3. Calcula por equipa: `group_wins`, `group_draws`, `stage_reached`
4. Faz upsert em `team_progress`
5. Atualiza `competition.last_synced_at`

**Otimização:** se não houver jogos com status `FINISHED` no dia, a função executa apenas 1 chamada leve à API e termina.

**Segurança:** a função valida um secret header antes de processar (para chamadas manuais do admin).

### Agendamento via pg_cron

```sql
-- Corre de 30 em 30 minutos durante o período do Mundial
SELECT cron.schedule(
  'sync-results',
  '*/30 * * * *',
  $$SELECT net.http_post(url := 'https://<project>.supabase.co/functions/v1/sync-results', ...) $$
);
```

Ativo entre **11 Jun – 19 Jul 2026**. Fora deste período, o cron pode ser desativado.

### Fallback Manual

- Botão "Sincronizar agora" no painel admin chama a mesma Edge Function
- Edição manual campo a campo por equipa (para corrigir dados da API)

### Indicador no Frontend

- Campo `competition.last_synced_at` armazenado na BD (pode ser `null` antes do primeiro sync)
- Frontend calcula: `next_update = last_synced_at + 30 min`
- Exibido como: "🔄 Próxima atualização em 14 min"
- Se `last_synced_at` for `null`: exibe "Aguarda primeira sincronização"
- Visível na página pública `/` e no tab Classificação do jogador

---

## Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Token de jogador inválido | Página 404 discreta, sem revelar existência do token |
| Token de admin inválido | Redirect para `/` |
| Sorteio já executado | Botão desativado; Server Action valida antes de executar |
| Escolha fora do estado `draft` | Server Action rejeita com mensagem clara |
| Sync falhou | Retry automático (Edge Function); admin notificado no painel |
| API de resultados indisponível | Dados ficam como estavam; sem impacto na app |

---

## Design Visual

- **Tema:** Dark & Premium — fundo escuro (#0a0a1a), acentos dourados (#f0c040)
- **Língua:** Português
- **Dispositivo:** Mobile-first; enhanced para desktop
- **Componentes:** shadcn/ui com tema personalizado dark/gold

---

## Fora de Âmbito (V1)

- Login Google
- Notificações push
- Histórico de pontuação / gráficos de evolução
- Integração automática com múltiplas competições
- Modo multi-competição
