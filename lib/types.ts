export type CompetitionStatus =
  | 'setup'
  | 'draft'
  | 'locked'
  | 'running'
  | 'finished'

export type StageReached =
  | 'group_stage'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'
  | 'champion'

export type Competition = {
  id: number
  status: CompetitionStatus
  last_synced_at: string | null
  updated_at: string
}

export type Player = {
  id: string
  name: string
  access_token: string
  created_at: string
}

export type Team = {
  id: string
  name: string
  pot: number
  flag_emoji: string
  api_id: number | null
  created_at: string
}

export type PlayerTeam = {
  id: string
  player_id: string
  team_id: string
  pot: number
}

export type TeamProgress = {
  team_id: string
  group_wins: number
  group_draws: number
  stage_reached: StageReached
  is_champion: boolean
  updated_at: string
}

// Enriched types for UI
export type TeamWithProgress = Team & {
  progress: TeamProgress
}

export type PlayerTeamWithProgress = {
  player_team_id: string
  team: Team
  pot: number
  progress: TeamProgress
}

export type PlayerWithScore = {
  player: Player
  teams: PlayerTeamWithProgress[]
  totalScore: number
}

export type Fixture = {
  id: string
  api_id: number
  stage: string
  group: string | null
  utc_date: string          // ISO string from Supabase
  status: string            // SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
  home_team: { id: string; name: string; flag_emoji: string; mascot: string | null } | null
  away_team: { id: string; name: string; flag_emoji: string; mascot: string | null } | null
  home_score: number | null
  away_score: number | null
}
