export function shuffleAndAssign<T extends string>(
  players: T[],
  teams: T[]
): Array<{ playerId: T; teamId: T }> {
  if (players.length !== teams.length) {
    throw new Error('Players and teams arrays must have equal length')
  }
  const shuffled = [...teams].sort(() => Math.random() - 0.5)
  return players.map((playerId, i) => ({ playerId, teamId: shuffled[i] }))
}
