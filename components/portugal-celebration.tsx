'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PortugalGameStatus } from '@/lib/portugal'
import { toDisplayTime } from '@/lib/fixtures'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle'
}

const PT_COLORS = [
  '#006600', // green
  '#FF0000', // red
  '#FFD700', // gold
  '#FFFFFF', // white
  '#003300', // dark green
  '#CC0000', // dark red
]

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particles = useRef<Particle[]>([])
  const animFrame = useRef<number>(0)

  const launch = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const count = 120
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2)
      const speed = 4 + Math.random() * 8
      newParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height + 10,
        vx: Math.cos(angle) * speed * (0.5 + Math.random()),
        vy: -speed - Math.random() * 6,
        size: 4 + Math.random() * 6,
        color: PT_COLORS[Math.floor(Math.random() * PT_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      })
    }
    particles.current.push(...newParticles)

    if (!animFrame.current) {
      const animate = () => {
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particles.current = particles.current.filter(p => p.opacity > 0.01)

        for (const p of particles.current) {
          p.x += p.vx
          p.vy += 0.15
          p.y += p.vy
          p.vx *= 0.99
          p.rotation += p.rotationSpeed
          p.opacity -= 0.008

          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = Math.max(0, p.opacity)
          ctx.fillStyle = p.color

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          } else {
            ctx.beginPath()
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.restore()
        }

        if (particles.current.length > 0) {
          animFrame.current = requestAnimationFrame(animate)
        } else {
          animFrame.current = 0
        }
      }
      animFrame.current = requestAnimationFrame(animate)
    }
  }, [canvasRef])

  useEffect(() => {
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, [])

  return launch
}

function PortugalBanner({
  status,
  kickoffTime,
  score,
}: {
  status: PortugalGameStatus
  kickoffTime: string | null
  score: string | null
}) {
  if (status === 'none') return null

  const messages: Record<Exclude<PortugalGameStatus, 'none'>, string> = {
    today: `🇵🇹 PORTUGAL JOGA HOJE! ⚽ ${kickoffTime ?? ''}`,
    soon: `🇵🇹 PORTUGAL ESTÁ A JOGAR! 🔥 ${kickoffTime ?? ''}`,
    live: `🇵🇹 PORTUGAL EM CAMPO! ${score ?? ''} 🔴`,
    finished_today: `🇵🇹 PORTUGAL JOGOU HOJE! ${score ?? ''} ✅`,
  }

  const isLive = status === 'live'
  const isSoon = status === 'soon'

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl px-4 py-2.5 text-center font-bold text-sm
        ${isLive
          ? 'bg-[linear-gradient(90deg,#006600,#004d00,#006600)] text-white'
          : isSoon
          ? 'bg-[linear-gradient(90deg,#8B0000,#CC0000,#8B0000)] text-white'
          : status === 'finished_today'
          ? 'bg-[linear-gradient(90deg,#003300,#006600,#003300)] text-white'
          : 'bg-[linear-gradient(90deg,#004d00,#006600,#004d00)] text-white'
        }
      `}
    >
      {(isLive || isSoon) && (
        <div className="absolute inset-0 animate-[portugal-pulse_2s_ease-in-out_infinite] bg-white/10" />
      )}
      <span className="relative z-10 tracking-wide">
        {messages[status]}
      </span>
    </div>
  )
}

function SiuuuButton({ onSiuuu }: { onSiuuu: () => void }) {
  const [animating, setAnimating] = useState(false)
  const [siuCount, setSiuCount] = useState(0)

  const handleClick = () => {
    setAnimating(true)
    setSiuCount(c => c + 1)
    onSiuuu()
    setTimeout(() => setAnimating(false), 800)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        relative flex items-center gap-2 rounded-full px-5 py-2.5
        bg-[linear-gradient(135deg,#006600,#004d00)] border border-green-600/50
        text-white font-extrabold text-sm uppercase tracking-widest
        active:scale-95 transition-transform
        ${animating ? 'animate-[siuuu-jump_0.8s_ease-out]' : ''}
      `}
    >
      <span className={`text-lg transition-transform ${animating ? 'scale-125' : ''}`}>
        🇵🇹
      </span>
      <span>SIUUU!</span>
      {siuCount > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white px-1">
          {siuCount}
        </span>
      )}
    </button>
  )
}

export function PortugalCelebration({
  status,
  utcDate,
  homeScore,
  awayScore,
  homeTeamName,
}: {
  status: PortugalGameStatus
  utcDate: string | null
  homeScore: number | null
  awayScore: number | null
  homeTeamName: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const launchConfetti = useConfetti(canvasRef)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Auto-launch confetti when live
  useEffect(() => {
    if (status === 'live') {
      const id = setInterval(launchConfetti, 15_000)
      launchConfetti()
      return () => clearInterval(id)
    }
  }, [status, launchConfetti])

  if (status === 'none') return null

  const kickoffTime = utcDate ? toDisplayTime(utcDate) : null
  const score =
    homeScore != null && awayScore != null
      ? `${homeScore}–${awayScore}`
      : null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
      />
      <div className="space-y-3">
        <PortugalBanner
          status={status}
          kickoffTime={kickoffTime}
          score={score}
        />
        <div className="flex justify-center">
          <SiuuuButton onSiuuu={launchConfetti} />
        </div>
      </div>
    </>
  )
}
