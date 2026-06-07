import Image from 'next/image'

type TeamMascot = { slug: string; name: string }

export function MascotHero({
  home,
  away,
}: {
  home: TeamMascot | null
  away: TeamMascot | null
}) {
  const mascots = [home, away].filter(Boolean) as TeamMascot[]
  if (mascots.length === 0) return null

  if (mascots.length === 1) {
    const m = mascots[0]
    return (
      <div className="bg-night-card border border-gold/20 rounded-xl p-4 flex flex-col items-center">
        <Image
          src={`/mascots/${m.slug}.webp`}
          alt={m.name}
          width={200}
          height={200}
        />
        <p className="text-xs text-muted-foreground mt-2">Mascote · {m.name}</p>
      </div>
    )
  }

  // Both mascots — face each other
  return (
    <div className="bg-night-card border border-gold/20 rounded-xl p-4 flex justify-around items-end">
      <div className="text-center">
        <Image
          src={`/mascots/${mascots[0].slug}.webp`}
          alt={mascots[0].name}
          width={160}
          height={160}
        />
        <p className="text-xs text-muted-foreground mt-2">{mascots[0].name}</p>
      </div>
      <span className="text-muted-foreground text-sm self-center pb-6">vs</span>
      <div className="text-center">
        <Image
          src={`/mascots/${mascots[1].slug}.webp`}
          alt={mascots[1].name}
          width={160}
          height={160}
        />
        <p className="text-xs text-muted-foreground mt-2">{mascots[1].name}</p>
      </div>
    </div>
  )
}
