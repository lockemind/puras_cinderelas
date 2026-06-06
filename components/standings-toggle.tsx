'use client'

import { useState } from 'react'
import type { getRankings, getAllTeamsWithProgress } from '@/actions/results'
import { RankingTable } from '@/components/ranking-table'
import { TeamStandings } from '@/components/team-standings'

type Props = {
  rankings: Awaited<ReturnType<typeof getRankings>>
  teams: Awaited<ReturnType<typeof getAllTeamsWithProgress>>
  expandedPlayerId: string
  isLocked: boolean
}

export function StandingsToggle({ rankings, teams, expandedPlayerId, isLocked }: Props) {
  const [view, setView] = useState<'players' | 'teams'>('players')

  return (
    <div className="space-y-4">
      <div className="flex rounded border border-night-border overflow-hidden text-sm">
        <button
          onClick={() => setView('players')}
          className={`flex-1 py-2 font-medium transition-colors ${
            view === 'players'
              ? 'bg-gold text-night'
              : 'bg-night-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Jogadores
        </button>
        <button
          onClick={() => setView('teams')}
          className={`flex-1 py-2 font-medium transition-colors ${
            view === 'teams'
              ? 'bg-gold text-night'
              : 'bg-night-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Seleções
        </button>
      </div>

      {view === 'players' ? (
        <RankingTable rankings={rankings} expandedId={expandedPlayerId} isLocked={isLocked} />
      ) : (
        <TeamStandings teams={teams} />
      )}
    </div>
  )
}
