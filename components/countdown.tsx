'use client'

import { useTickingNow } from '@/components/live-minute'

export function Countdown({ utcDate }: { utcDate: string }) {
  const now = useTickingNow()
  const diffMin = Math.max(0, Math.round((new Date(utcDate).getTime() - now) / 60_000))
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60

  return (
    <span
      className="text-gold text-[25px] font-extrabold tabular-nums leading-tight whitespace-nowrap"
      suppressHydrationWarning
    >
      {h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`}
    </span>
  )
}
