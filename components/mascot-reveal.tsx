'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const MASCOTS = [
  'alemanha', 'argentina', 'belgica', 'brasil', 'canada',
  'espanha', 'franca', 'inglaterra', 'mexico', 'paises-baixos',
  'portugal', 'usa',
]

const MIN_MS = 1500

function pick() {
  return MASCOTS[Math.floor(Math.random() * MASCOTS.length)]
}

export function MascotReveal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [mascot, setMascot] = useState(pick)
  const [showing, setShowing] = useState(true)

  // Initial screen open
  useEffect(() => {
    const t = setTimeout(() => setShowing(false), MIN_MS)
    return () => clearTimeout(t)
  }, [])

  // Tab navigation
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    setMascot(pick())
    setShowing(true)
    const t = setTimeout(() => setShowing(false), MIN_MS)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <>
      {showing && (
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
      )}
      <div className={showing ? 'hidden' : undefined}>
        {children}
      </div>
    </>
  )
}
