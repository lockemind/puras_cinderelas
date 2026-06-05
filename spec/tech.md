# Puras Cinderelas 2026
## Documento Técnico

## Objetivo

Este documento descreve a implementação técnica da aplicação web que suporta o jogo "Puras Cinderelas 2026".

O sistema será desenvolvido para uma única competição privada composta por 12 participantes.

---

# Arquitetura

## Frontend

- Next.js
- React
- Typescript
- Tailwind CSS
- shadcn/ui

## Backend

- Next.js Server Actions
- Supabase

## Base de Dados

- PostgreSQL (via Supabase)

## Hosting

- Vercel

---

# Utilizadores

Existem dois tipos de utilizador:

## Administrador

Responsável por:

- Configurar a competição
- Gerir participantes
- Efetuar o sorteio do Pote 1
- Bloquear escolhas
- Atualizar resultados das seleções
- Recalcular classificações

## Participante

Pode:

- Consultar a sua equipa
- Escolher seleções dos Potes 2, 3 e 4
- Consultar classificações
- Consultar estatísticas

---

# Modelo de Dados

## players

Representa os participantes.

```sql
players
```

| Campo | Tipo |
|---------|---------|
| id | uuid |
| name | text |
| access_token | text |
| created_at | timestamp |

---

## teams

Representa todas as seleções do Mundial.

```sql
teams
```

| Campo | Tipo |
|---------|---------|
| id | uuid |
| name | text |
| pot | integer |
| created_at | timestamp |

---

## player_teams

Representa as seleções atribuídas a cada participante.

```sql
player_teams
```

| Campo | Tipo |
|---------|---------|
| id | uuid |
| player_id | uuid |
| team_id | uuid |
| pot | integer |

Regras:

- Um jogador tem exatamente uma equipa de cada pote.
- O Pote 1 é atribuído por sorteio.
- Os Potes 2, 3 e 4 são escolhidos pelo utilizador.
- Equipas dos Potes 2, 3 e 4 podem repetir entre jogadores.

---

## team_progress

Representa o desempenho de cada seleção.

```sql
team_progress
```

| Campo | Tipo |
|---------|---------|
| team_id | uuid |
| group_wins | integer |
| group_draws | integer |
| stage_reached | text |
| is_champion | boolean |
| updated_at | timestamp |

---

## score_entries

Tabela opcional para auditoria de pontuações.

```sql
score_entries
```

| Campo | Tipo |
|---------|---------|
| id | uuid |
| player_id | uuid |
| team_id | uuid |
| reason | text |
| points | integer |
| created_at | timestamp |

---

# Estados da Competição

## Setup

A competição está a ser configurada.

Permitido:

- Criar jogadores
- Configurar equipas

Não permitido:

- Escolhas dos participantes

---

## Draft

O sorteio do Pote 1 já foi realizado.

Permitido:

- Escolher equipas dos Potes 2, 3 e 4

---

## Locked

As escolhas foram encerradas.

Permitido:

- Apenas consulta

Não permitido:

- Alterar equipas

---

## Running

O Mundial está a decorrer.

Permitido:

- Atualizar resultados
- Atualizar classificações

---

## Finished

Competição terminada.

Classificação final congelada.

---

# Sorteio do Pote 1

## Processo

1. Obter lista de participantes
2. Obter lista de equipas do Pote 1
3. Baralhar ambas as listas
4. Atribuir sequencialmente

Exemplo:

```text
Pedro -> Portugal
João -> Alemanha
Maria -> Brasil
...
```

Cada equipa do Pote 1 é utilizada uma única vez.

---

# Escolha dos Potes 2, 3 e 4

## Regras

Cada participante deve selecionar:

- 1 equipa do Pote 2
- 1 equipa do Pote 3
- 1 equipa do Pote 4

Validações:

- Não pode escolher duas equipas do mesmo pote
- Pode alterar enquanto o draft estiver aberto
- Equipas podem ser repetidas entre participantes

---

# Sistema de Pontuação

## Fase de Grupos

```text
Vitória = 3 pontos
Empate = 1 ponto
```

Fórmula:

```text
(group_wins * 3)
+
(group_draws * 1)
```

---

## Fase a Eliminar

### Vitória nos 1/16

```text
+5 pontos
```

### Vitória nos 1/8

```text
+8 pontos
```

### Vitória nos Quartos

```text
+12 pontos
```

### Vitória na Meia-final

```text
+15 pontos
```

### Campeão Mundial

```text
+25 pontos
```

---

# Bónus Cinderela

## Equipas do Pote 3

| Fase | Bónus |
|--------|--------|
| Quartos | 3 |
| Meia-final | 7 |
| Final | 10 |
| Campeão | 15 |

---

## Equipas do Pote 4

| Fase | Bónus |
|--------|--------|
| Quartos | 5 |
| Meia-final | 10 |
| Final | 15 |
| Campeão | 20 |

---

# Cálculo da Pontuação

Pseudo-código:

```typescript
function calculateTeamScore(team) {
  let score = 0;

  score += team.groupWins * 3;
  score += team.groupDraws;

  score += stagePoints(team.stageReached);

  score += cinderellaBonus(team);

  return score;
}
```

---

# Ranking

A classificação é calculada somando os pontos das quatro seleções do participante.

```typescript
playerScore =
  pot1Score +
  pot2Score +
  pot3Score +
  pot4Score;
```

Os participantes são ordenados por:

```text
Pontuação Total DESC
```

---

# Critérios de Desempate

1. Maior número de campeões mundiais
2. Maior número de finalistas
3. Maior número de meias-finais
4. Maior número de quartos de final
5. Sorteio

---

# Páginas da Aplicação

## Página Inicial

- Estado da competição
- Classificação atual
- Próximas atualizações

---

## Minha Equipa

- Seleção do Pote 1
- Seleção do Pote 2
- Seleção do Pote 3
- Seleção do Pote 4

---

## Escolhas

Disponível apenas durante o Draft.

Permite selecionar equipas.

---

## Classificação

Tabela global:

| Posição | Jogador | Pontos |
|----------|----------|----------|

---

## Seleções

Mostra:

- Todas as seleções
- Pontuação atual
- Fase alcançada

---

## Administração

Permite:

- Gerir participantes
- Executar sorteio
- Atualizar desempenho das seleções
- Bloquear escolhas
- Recalcular classificações

---

# Funcionalidades Futuras

## V2

- Login Google
- Notificações
- Histórico de pontuação
- Gráficos de evolução
- Timeline do Mundial

## V3

- Integração automática com API de resultados FIFA
- Atualizações automáticas
- Múltiplas competições
- Fantasy de Europeu e Mundial
