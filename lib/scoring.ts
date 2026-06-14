import type { TeamProgress, StageReached } from './types'

// stage_reached semantics:
// group_stage = eliminated in groups
// r32         = played in r32, lost (0 knockout wins)
// r16         = played in r16, lost (won r32 = +5)
// qf          = played in qf, lost (won r32+r16 = +13)
// sf          = played in sf, lost (won r32+r16+qf = +25)
// final       = played in final, lost (won r32+r16+qf+sf = +40)
// champion    = won the final (won everything = +65)

const STAGE_ORDER: StageReached[] = [
  'group_stage', 'r32', 'r16', 'qf', 'sf', 'final', 'champion',
]

// Points for winning the match that advanced you TO this stage
const POINTS_FOR_WINNING_INTO: Partial<Record<StageReached, number>> = {
  r16: 5,       // won r32 to reach r16
  qf: 8,        // won r16 to reach qf
  sf: 12,       // won qf to reach sf
  final: 15,    // won sf to reach final
  champion: 25, // won the final
}

const CINDERELA_BONUS: Record<3 | 4, Partial<Record<StageReached, number>>> = {
  3: { r32: 3, r16: 7, qf: 10, sf: 15, final: 20, champion: 25 },
  4: { r32: 5, r16: 10, qf: 15, sf: 20, final: 25, champion: 30 },
}

export type KnockoutRoundDetail = { label: string; points: number }
export type CinderelaBonusDetail = { label: string; points: number }

export type ScoreBreakdown = {
  groupStagePoints: number
  knockoutPoints: number
  knockoutDetail: KnockoutRoundDetail[]
  cinderelaBonusTotal: number
  cinderelaBonusDetail: CinderelaBonusDetail[]
  total: number
}

export function mergeProgress(
  db: { group_wins: number; group_draws: number; stage_reached: StageReached; is_champion: boolean },
  live: { group_wins: number; group_draws: number; stage_reached: StageReached; is_champion: boolean } | undefined,
) {
  if (!live) return db
  return {
    group_wins: live.group_wins,
    group_draws: live.group_draws,
    stage_reached: (live.stage_reached !== 'group_stage' ? live.stage_reached : db.stage_reached) as StageReached,
    is_champion: live.is_champion,
  }
}

export function getScoreBreakdown(progress: TeamProgress, pot: number): ScoreBreakdown {
  const groupStagePoints = progress.group_wins * 3 + progress.group_draws

  const stageRank = STAGE_ORDER.indexOf(progress.stage_reached)

  // Knockout rounds: you earned points for winning each round that advanced you forward
  const knockoutRounds: Array<{ stage: StageReached; label: string }> = [
    { stage: 'r16', label: '1/16 de final' },
    { stage: 'qf', label: '1/8 de final' },
    { stage: 'sf', label: 'Quartos de final' },
    { stage: 'final', label: 'Meia-final' },
    { stage: 'champion', label: 'Campeão Mundial' },
  ]

  const knockoutDetail: KnockoutRoundDetail[] = []
  for (const { stage, label } of knockoutRounds) {
    const sRank = STAGE_ORDER.indexOf(stage)
    if (sRank <= stageRank) {
      const pts = POINTS_FOR_WINNING_INTO[stage] ?? 0
      if (pts > 0) knockoutDetail.push({ label, points: pts })
    }
  }
  const knockoutPoints = knockoutDetail.reduce((s, r) => s + r.points, 0)

  // Cinderela bonus (cumulative, only pots 3 and 4)
  const cinderelaBonusDetail: CinderelaBonusDetail[] = []
  if (pot === 3 || pot === 4) {
    const table = CINDERELA_BONUS[pot as 3 | 4]
    const bonusMilestones: Array<{ stage: StageReached; label: string }> = [
      { stage: 'r32', label: 'Dezasseis-avos de final' },
      { stage: 'r16', label: 'Oitavos de final' },
      { stage: 'qf', label: 'Quartos de final' },
      { stage: 'sf', label: 'Meia-final' },
      { stage: 'final', label: 'Final' },
      { stage: 'champion', label: 'Campeão' },
    ]
    for (const { stage, label } of bonusMilestones) {
      const sRank = STAGE_ORDER.indexOf(stage)
      if (sRank <= stageRank) {
        const pts = table[stage] ?? 0
        cinderelaBonusDetail.push({ label, points: pts })
      }
    }
  }
  const cinderelaBonusTotal = cinderelaBonusDetail.reduce((s, r) => s + r.points, 0)

  return {
    groupStagePoints,
    knockoutPoints,
    knockoutDetail,
    cinderelaBonusTotal,
    cinderelaBonusDetail,
    total: groupStagePoints + knockoutPoints + cinderelaBonusTotal,
  }
}

export function calculateTeamScore(progress: TeamProgress, pot: number): number {
  return getScoreBreakdown(progress, pot).total
}

// football-data fixture stage → StageReached the winner advances into
export const FD_WINNER_ADVANCES_TO: Partial<Record<string, StageReached>> = {
  LAST_32: 'r16',
  LAST_16: 'qf',
  QUARTER_FINALS: 'sf',
  SEMI_FINALS: 'final',
  FINAL: 'champion',
}

export type WinWorth = { winPoints: number; cinderelaBonus: number }

export function getWinWorth(fdStage: string, pot: number): WinWorth {
  if (fdStage === 'GROUP_STAGE') return { winPoints: 3, cinderelaBonus: 0 }
  const advancesTo = FD_WINNER_ADVANCES_TO[fdStage]
  if (!advancesTo) return { winPoints: 0, cinderelaBonus: 0 }
  const winPoints = POINTS_FOR_WINNING_INTO[advancesTo] ?? 0
  const cinderelaBonus =
    pot === 3 || pot === 4 ? CINDERELA_BONUS[pot as 3 | 4][advancesTo] ?? 0 : 0
  return { winPoints, cinderelaBonus }
}
