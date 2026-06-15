import { MascotAvatar } from '@/components/mascot-avatar'
import { Countdown } from '@/components/countdown'
import { LiveMinute } from '@/components/live-minute'

type DuelTeam = {
  name: string
  mascot: string | null
  flagEmoji: string
  isPlayerTeam: boolean
}

type DuelHeroProps = {
  home: DuelTeam
  away: DuelTeam
  status: 'upcoming' | 'live' | 'finished'
  utcDate: string
  homeScore: number | null
  awayScore: number | null
  stageLabel: string
  winner: 'home' | 'away' | 'draw' | null
}

const BORDER_CLASS = {
  upcoming: 'border-[1.5px] border-gold/35',
  live: 'border-[1.5px] border-destructive/45',
  finished: 'border border-night-border',
}

const BG_CLASS = {
  upcoming: 'bg-[linear-gradient(180deg,oklch(0.17_0.02_265),oklch(0.11_0.015_265))]',
  live: 'bg-[linear-gradient(180deg,oklch(0.18_0.025_25),oklch(0.11_0.015_265))]',
  finished: 'bg-[linear-gradient(180deg,oklch(0.16_0.018_265),oklch(0.11_0.015_265))]',
}

function TopLabel({ status, utcDate, stageLabel }: Pick<DuelHeroProps, 'status' | 'utcDate' | 'stageLabel'>) {
  if (status === 'upcoming') {
    const d = new Date(utcDate)
    const day = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', timeZone: 'Europe/Lisbon' })
    const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })
    return (
      <span className="absolute top-3 left-1/2 -translate-x-1/2 text-muted-foreground text-[10px] tracking-[2px] uppercase font-bold whitespace-nowrap">
        {day} · {time}
      </span>
    )
  }

  if (status === 'live') {
    return (
      <span className="absolute top-[11px] left-1/2 -translate-x-1/2 flex items-center gap-[5px]">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-[pulse_1.2s_ease-in-out_infinite_alternate]" />
        <LiveMinute utcDate={utcDate} />
      </span>
    )
  }

  return (
    <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[oklch(0.45_0.01_265)] text-[10px] tracking-[2px] uppercase font-bold">
      Terminado · FT
    </span>
  )
}

function TeamSide({ team, side, status, winner }: { team: DuelTeam; side: 'home' | 'away'; status: DuelHeroProps['status']; winner: DuelHeroProps['winner'] }) {
  const isWinner = status === 'finished' && winner === side
  const isLoser = status === 'finished' && winner !== null && winner !== 'draw' && winner !== side
  const showBadge = team.isPlayerTeam && status !== 'finished'
  const showWonLabel = isWinner && status === 'finished'

  return (
    <div className={`flex flex-col items-center gap-2 w-24 ${isLoser ? 'opacity-60' : ''}`}>
      <MascotAvatar
        mascot={team.mascot}
        alt={team.name}
        size={78}
        ring={team.isPlayerTeam ? 'gold' : isLoser ? 'eliminated' : 'neutral'}
        ringWidth={2.5}
        glow={team.isPlayerTeam && !isLoser}
        fallbackEmoji={team.flagEmoji}
      />
      <span className={`text-[13px] font-bold ${isLoser ? 'text-[oklch(0.6_0.008_265)]' : 'text-foreground'}`}>
        {team.name}
      </span>
      {showBadge && (
        <span className="bg-gold text-night text-[9px] font-extrabold px-[7px] py-[2px] rounded-full tracking-[1px]">
          A TUA
        </span>
      )}
      {showWonLabel && (
        <span className="text-[oklch(0.7_0.14_150)] text-[11px] font-bold">✓ venceu</span>
      )}
    </div>
  )
}

export function DuelHero(props: DuelHeroProps) {
  const { home, away, status, utcDate, homeScore, awayScore, winner } = props

  return (
    <div className={`relative rounded-2xl px-4 pt-[30px] pb-[18px] flex items-center justify-between ${BORDER_CLASS[status]} ${BG_CLASS[status]}`}>
      <TopLabel {...props} />
      <TeamSide team={home} side="home" status={status} winner={winner} />

      <div className="flex flex-col items-center gap-[3px]">
        {status === 'upcoming' ? (
          <>
            <span className="text-muted-foreground text-[10px] uppercase tracking-[1.5px]">começa em</span>
            <Countdown utcDate={utcDate} />
          </>
        ) : (
          <span className="text-foreground text-[34px] font-extrabold tabular-nums leading-none whitespace-nowrap">
            {homeScore ?? '?'}–{awayScore ?? '?'}
          </span>
        )}
      </div>

      <TeamSide team={away} side="away" status={status} winner={winner} />
    </div>
  )
}
