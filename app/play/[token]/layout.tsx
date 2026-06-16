import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { PlayerNav } from '@/components/player-nav'
import { PlayerHeaderMenu } from '@/components/player-header-menu'

export default async function PlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)

  if (!player) {
    notFound()
  }

  const base = `/play/${token}`

  return (
    <div className="min-h-dvh bg-night flex flex-col">
      <header className="px-4 pt-6 pb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Puras Cinderelas"
            width={40}
            height={40}
            className="size-10 rounded-full flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-gold text-xs uppercase tracking-widest">
              Puras Cinderelas 2026
            </p>
            <h1 className="truncate text-foreground font-bold text-lg">{player.name}</h1>
          </div>
        </div>
        <PlayerHeaderMenu rulesHref={`${base}/rules`} />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {children}
      </main>

      <PlayerNav tabs={[
        { href: `${base}/team`, label: 'Equipa', icon: '⚽' },
        { href: `${base}/ranking`, label: 'Classificação', icon: '🏆' },
        { href: `${base}/selections`, label: 'Jogos', icon: '📅' },
      ]} />
    </div>
  )
}
