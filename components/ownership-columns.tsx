import { MascotAvatar, type MascotRing } from '@/components/mascot-avatar'
import type { TeamOwnerCard } from '@/actions/fixtures'

function OwnerCard({ card, ring }: { card: TeamOwnerCard; ring: MascotRing }) {
  return (
    <div className="bg-night-card border border-night-border rounded-xl px-3 py-3 flex flex-col gap-[9px]">
      <div className="flex items-center gap-2">
        <MascotAvatar
          mascot={card.team.mascot}
          alt={card.team.name}
          size={26}
          ring={ring}
          ringWidth={2}
          fallbackEmoji={card.team.flag_emoji}
        />
        <span className="text-foreground text-[13px] font-bold flex-1 truncate">{card.team.name}</span>
        <span className="text-gold text-[13px] font-bold tabular-nums">{card.totalPoints}</span>
      </div>
      <div className="h-px bg-night-border" />
      {card.owners.map(owner => (
        <div key={owner.playerId} className="flex items-center gap-1.5">
          <span className={`text-[13px] ${owner.isCurrentPlayer ? 'font-bold text-foreground' : 'text-[oklch(0.7_0.008_265)]'}`}>
            {owner.playerName}
          </span>
          {owner.isCurrentPlayer && (
            <span className="bg-gold text-night text-[8px] font-extrabold px-[5px] py-px rounded-[5px] tracking-[0.5px]">
              TU
            </span>
          )}
        </div>
      ))}
      {card.owners.length === 0 && (
        <span className="text-[13px] text-muted-foreground">—</span>
      )}
    </div>
  )
}

export function OwnershipColumns({
  home,
  away,
  playerTeamSide,
}: {
  home: TeamOwnerCard | null
  away: TeamOwnerCard | null
  playerTeamSide: 'home' | 'away' | 'both' | null
}) {
  if (!home && !away) return null

  const homeRing: MascotRing = playerTeamSide === 'home' || playerTeamSide === 'both' ? 'gold' : 'neutral'
  const awayRing: MascotRing = playerTeamSide === 'away' || playerTeamSide === 'both' ? 'gold' : 'neutral'

  return (
    <div className="flex flex-col gap-[9px]">
      <span className="text-muted-foreground text-[11px] tracking-[2px] uppercase font-semibold">
        Quem tem estas equipas
      </span>
      <div className="grid grid-cols-2 gap-2.5">
        {home && <OwnerCard card={home} ring={homeRing} />}
        {away && <OwnerCard card={away} ring={awayRing} />}
      </div>
    </div>
  )
}
