'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type FullScheduleDetailsProps = {
  targetId: string | null
  children: ReactNode
}

export function FullScheduleDetails({ targetId, children }: FullScheduleDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showJump, setShowJump] = useState(false)

  const scrollToTarget = (behavior: ScrollBehavior = 'smooth') => {
    if (!targetId) return

    document.getElementById(targetId)?.scrollIntoView({
      behavior,
      block: 'start',
    })
  }

  useEffect(() => {
    if (!isOpen || !targetId) return

    const target = document.getElementById(targetId)
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowJump(!entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: '-72px 0px -45% 0px',
        threshold: 0,
      },
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [isOpen, targetId])

  return (
    <details
      ref={detailsRef}
      className="group"
      onToggle={event => {
        const open = event.currentTarget.open
        setIsOpen(open)

        if (!open) {
          setShowJump(false)
        }

        if (open && targetId) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => scrollToTarget())
          })
        }
      }}
    >
      <summary className="cursor-pointer list-none text-center text-[13px] font-medium text-gold-dark active:opacity-70 py-1">
        ver calendário completo{' '}
        <span className="inline-block transition-transform duration-200 group-open:rotate-180">
          ▾
        </span>
      </summary>

      {children}

      {targetId && showJump && (
        <button
          type="button"
          onClick={() => scrollToTarget()}
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-gold/50 bg-gold px-4 py-2 text-xs font-bold text-night shadow-[0_12px_28px_oklch(0_0_0/0.28)] active:scale-[0.98] sm:bottom-8"
        >
          Próximos jogos
        </button>
      )}
    </details>
  )
}
