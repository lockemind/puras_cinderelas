import Image from 'next/image'

export type MascotRing = 'gold' | 'default' | 'eliminated' | 'neutral'

const RING_CLASS: Record<MascotRing, string> = {
  gold: 'border-gold',
  default: 'border-gold-dark',
  eliminated: 'border-[oklch(0.40_0.01_265)]',
  neutral: 'border-[oklch(0.35_0.015_265)]',
}

export function MascotAvatar({
  mascot,
  alt,
  size,
  ring = 'default',
  ringWidth = 2,
  glow = false,
  fallbackEmoji,
  className = '',
}: {
  mascot: string | null
  alt: string
  size: number
  ring?: MascotRing
  ringWidth?: number
  glow?: boolean
  fallbackEmoji?: string
  className?: string
}) {
  const base = `rounded-full bg-black border-solid shrink-0 ${RING_CLASS[ring]} ${className}`
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderWidth: ringWidth,
    boxShadow: glow ? '0 0 24px oklch(0.82 0.15 85 / 0.25)' : undefined,
  }

  if (!mascot) {
    return (
      <span className={`inline-flex items-center justify-center ${base}`} style={style}>
        <span style={{ fontSize: size * 0.45 }}>{fallbackEmoji ?? '⚽'}</span>
      </span>
    )
  }

  return (
    <span className={`relative inline-block overflow-hidden ${base}`} style={style}>
      <Image
        src={`/mascots/${mascot}.webp`}
        alt={alt}
        fill
        sizes={`${size}px`}
        className={`object-cover ${ring === 'eliminated' ? 'grayscale' : ''}`}
      />
    </span>
  )
}
