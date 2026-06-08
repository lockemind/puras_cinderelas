'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Tab = { href: string; label: string; icon: string }

export function PlayerNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-night-card border-t border-night-border flex">
      {tabs.map(({ href, label, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
              isActive
                ? 'text-gold border-t-2 border-gold -mt-px'
                : 'text-muted-foreground hover:text-gold border-t-2 border-transparent -mt-px'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-xs mt-1 font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
