'use client'

import Image from 'next/image'
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

const SIUUU_STICKERS = [
  '/instagram_joana_duarte/stickers/03_DRhRGStCDBK_sticker.png',
  '/instagram_joana_duarte/stickers/04_DRUzlqLCBki_sticker.png',
  '/instagram_joana_duarte/stickers/05_DRH05xeCMRE_sticker.png',
  '/instagram_joana_duarte/stickers/06_DQ9-3RxCAKW_sticker.png',
  '/instagram_joana_duarte/stickers/07_DQcNItfiJJi_sticker.png',
  '/instagram_joana_duarte/stickers/08_DQHre4oiMMH_sticker.png',
  '/instagram_joana_duarte/stickers/09_DQE_rFuiFJN_sticker.png',
  '/instagram_joana_duarte/stickers/10_DQABpE7iCy3_sticker.png',
  '/instagram_joana_duarte/stickers/11_DP68iTCCBXD_sticker.png',
  '/instagram_joana_duarte/stickers/12_DPZQArwiE-i_sticker.png',
  '/instagram_joana_duarte/stickers/13_DPHbTpICJJL_sticker.png',
  '/instagram_joana_duarte/stickers/14_DO5oGIDiII1_sticker.png',
  '/instagram_joana_duarte/stickers/15_DOx2pPWCOJt_sticker.png',
  '/instagram_joana_duarte/stickers/16_DOwYz5mCKjA_sticker.png',
  '/instagram_joana_duarte/stickers/17_DOvLAb-iKBz_sticker.png',
  '/instagram_joana_duarte/stickers/18_DOsuOSFiKbD_sticker.png',
  '/instagram_joana_duarte/stickers/19_DOgqj2eCMrK_sticker.png',
  '/instagram_joana_duarte/stickers/20_DOa3SpbiDeA_sticker.png',
  '/instagram_joana_duarte/stickers/21_DOWhL5_iGP__sticker.png',
  '/instagram_joana_duarte/stickers/22_DODz7mniHEf_sticker.png',
  '/instagram_joana_duarte/stickers/23_DOBJ5oxCK6r_sticker.png',
  '/instagram_joana_duarte/stickers/24_DN8G5zviDuF_sticker.png',
  '/instagram_joana_duarte/stickers/25_DNtSkSN0AhV_sticker.png',
  '/instagram_joana_duarte/stickers/26_DNlWpUIoS5S_sticker.png',
  '/instagram_joana_duarte/stickers/27_DNfxwqFseNF_sticker.png',
  '/instagram_joana_duarte/stickers/28_DNYxpKuoI64_sticker.png',
  '/instagram_joana_duarte/stickers/29_DMz4J4dIzWs_sticker.png',
  '/instagram_joana_duarte/stickers/30_DMdCUunIwpw_sticker.png',
] as const

function randomStickerIndex(currentIndex?: number): number {
  if (SIUUU_STICKERS.length <= 1) return 0

  let nextIndex = Math.floor(Math.random() * SIUUU_STICKERS.length)
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * SIUUU_STICKERS.length)
  }
  return nextIndex
}

function randomSiuuuMilestoneInterval(): number {
  return 1 + Math.floor(Math.random() * 9)
}

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
  const [showMilestone, setShowMilestone] = useState(false)
  const [milestoneCount, setMilestoneCount] = useState(0)
  const [stickerIndex, setStickerIndex] = useState(0)
  const nextMilestoneCountRef = useRef(randomSiuuuMilestoneInterval())
  const animationTimeoutRef = useRef<number | null>(null)
  const milestoneTimeoutRef = useRef<number | null>(null)

  const dismissMilestone = useCallback(() => {
    setShowMilestone(false)
    if (milestoneTimeoutRef.current != null) {
      window.clearTimeout(milestoneTimeoutRef.current)
      milestoneTimeoutRef.current = null
    }
  }, [])

  const handleClick = () => {
    setAnimating(true)
    setSiuCount(c => c + 1)
    onSiuuu()
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current)
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimating(false)
      animationTimeoutRef.current = null
    }, 800)
  }

  useEffect(() => {
    if (siuCount < nextMilestoneCountRef.current) return

    nextMilestoneCountRef.current = siuCount + randomSiuuuMilestoneInterval()
    setMilestoneCount(siuCount)
    setStickerIndex(randomStickerIndex())
    setShowMilestone(true)
    onSiuuu()
    if (milestoneTimeoutRef.current != null) {
      window.clearTimeout(milestoneTimeoutRef.current)
    }
    milestoneTimeoutRef.current = window.setTimeout(() => {
      setShowMilestone(false)
      milestoneTimeoutRef.current = null
    }, 6900)
  }, [siuCount, onSiuuu])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current != null) {
        window.clearTimeout(animationTimeoutRef.current)
      }
      if (milestoneTimeoutRef.current != null) {
        window.clearTimeout(milestoneTimeoutRef.current)
      }
    }
  }, [])

  const stickerSrc = SIUUU_STICKERS[stickerIndex]

  return (
    <>
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
          <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {siuCount}
          </span>
        )}
      </button>

      {showMilestone ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="siuuu-69-title"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-gold/60 bg-night-card p-6 text-center shadow-2xl shadow-gold/20 animate-[siuuu-pop_0.45s_cubic-bezier(.2,1.4,.4,1)]">
            <button
              type="button"
              onClick={dismissMilestone}
              aria-label="Fechar celebração dos SIUUUS"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg leading-none text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              ×
            </button>
            <div className="mx-auto mb-4 flex h-72 w-full items-center justify-center overflow-hidden">
              <Image
                key={stickerSrc}
                src={stickerSrc}
                alt="Sticker da Joana Duarte"
                width={280}
                height={360}
                sizes="(max-width: 640px) 80vw, 280px"
                className="h-full w-full object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.45)] animate-[siuuu-sticker_1.2s_ease-in-out]"
              />
            </div>
            <p id="siuuu-69-title" className="text-4xl font-black tracking-normal text-gold">
              {milestoneCount} SIUUUS!
            </p>
            <p className="mt-2 text-sm font-bold uppercase tracking-wide text-white">
              Nice. Cristiano aprovava.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Marco lendário desbloqueado. A bancada está oficialmente em modo festa.
            </p>
          </div>
        </div>
      ) : null}
    </>
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
