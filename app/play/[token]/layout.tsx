export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'

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
      <header className="px-4 pt-6 pb-2">
        <p className="text-gold text-xs uppercase tracking-widest">
          Puras Cinderelas 2026
        </p>
        <h1 className="text-foreground font-bold text-lg">{player.name}</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-night-card border-t border-night-border flex">
        <TabLink href={`${base}/team`} label="Equipa" icon="⚽" />
        <TabLink href={`${base}/ranking`} label="Classificação" icon="🏆" />
        <TabLink href={`${base}/selections`} label="Seleções" icon="🌍" />
      </nav>
    </div>
  )
}

function TabLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-gold transition-colors"
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-xs mt-1">{label}</span>
    </Link>
  )
}
