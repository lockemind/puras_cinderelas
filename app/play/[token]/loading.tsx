'use client'

import Image from 'next/image'

const MASCOTS = [
  'alemanha', 'argentina', 'belgica', 'brasil', 'canada',
  'espanha', 'franca', 'inglaterra', 'mexico', 'paises-baixos',
  'portugal', 'usa',
]

export default function Loading() {
  const mascot = MASCOTS[Math.floor(Math.random() * MASCOTS.length)]

  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-bounce">
        <Image
          src={`/mascots/${mascot}.webp`}
          alt="A carregar..."
          width={220}
          height={220}
          priority
        />
      </div>
    </div>
  )
}
