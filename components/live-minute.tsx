'use client'

import { useEffect, useState } from 'react'
import { estimateMatchTiming } from '@/lib/match-timing'

export function useTickingNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function LiveMinute({ utcDate }: { utcDate: string }) {
  const now = useTickingNow()
  const estimate = estimateMatchTiming(utcDate, now)

  if (estimate.estimatedPhase === 'HALF_TIME') {
    return (
      <span className="text-[11px] font-extrabold text-destructive tabular-nums">
        INT
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-destructive tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-[pulse_1.2s_ease-in-out_infinite]" />
      <span suppressHydrationWarning>{estimate.displayLabel}</span>
    </span>
  )
}
