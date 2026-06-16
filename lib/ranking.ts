export type FinishedFixtureScore = {
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
}

export type GoalStats = {
  goalsFor: number
  goalsAgainst: number
}

export type RankingSortEntry = GoalStats & {
  totalScore: number
  player: {
    name: string
  }
}

export function computeTeamGoalStats(fixtures: FinishedFixtureScore[]) {
  const stats = new Map<string, GoalStats>()

  const ensure = (teamId: string) => {
    if (!stats.has(teamId)) stats.set(teamId, { goalsFor: 0, goalsAgainst: 0 })
    return stats.get(teamId)!
  }

  for (const fixture of fixtures) {
    if (fixture.home_score == null || fixture.away_score == null) continue

    if (fixture.home_team_id) {
      const home = ensure(fixture.home_team_id)
      home.goalsFor += fixture.home_score
      home.goalsAgainst += fixture.away_score
    }

    if (fixture.away_team_id) {
      const away = ensure(fixture.away_team_id)
      away.goalsFor += fixture.away_score
      away.goalsAgainst += fixture.home_score
    }
  }

  return stats
}

export function sumGoalStats(teamIds: string[], statsByTeam: Map<string, GoalStats>): GoalStats {
  return teamIds.reduce(
    (total, teamId) => {
      const teamStats = statsByTeam.get(teamId)
      if (!teamStats) return total

      return {
        goalsFor: total.goalsFor + teamStats.goalsFor,
        goalsAgainst: total.goalsAgainst + teamStats.goalsAgainst,
      }
    },
    { goalsFor: 0, goalsAgainst: 0 }
  )
}

export function compareRankingEntries(a: RankingSortEntry, b: RankingSortEntry) {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst
  return a.player.name.localeCompare(b.player.name, 'pt')
}
