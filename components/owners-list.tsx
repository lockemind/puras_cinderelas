import type { PlayerOwnership } from '@/actions/fixtures'

export function OwnersList({
  ownership,
  currentPlayerId,
}: {
  ownership: PlayerOwnership[]
  currentPlayerId: string
}) {
  const sorted = [...ownership].sort((a, b) => {
    if (a.team && !b.team) return -1
    if (!a.team && b.team) return 1
    return a.player.name.localeCompare(b.player.name)
  })

  return (
    <div className="bg-night-card border border-night-border rounded-xl p-4">
      <p className="text-gold text-xs uppercase tracking-widest mb-3">
        Quem tem estas equipas
      </p>
      <div className="space-y-2">
        {sorted.map(({ player, team, points }) => {
          const isMe = player.id === currentPlayerId
          return (
            <div
              key={player.id}
              className="flex items-center justify-between text-sm"
            >
              <span
                className={
                  isMe
                    ? 'font-semibold text-foreground'
                    : team
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {player.name}
              </span>
              {team ? (
                <div className="text-right">
                  <div className="text-gold text-xs">
                    {team.flag_emoji} {team.name}
                  </div>
                  <div className="text-muted-foreground text-xs">{points} pts</div>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">— sem equipa</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
