'use client'

import Link from 'next/link'
import { EllipsisVerticalIcon, ScrollTextIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function PlayerHeaderMenu({ rulesHref }: { rulesHref: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu"
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-night-card hover:text-gold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:bg-night-card data-popup-open:text-gold"
      >
        <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border border-night-border bg-night-card shadow-xl"
      >
        <DropdownMenuLinkItem
          href={rulesHref}
          label="Regras de pontuação"
          closeOnClick
          render={<Link href={rulesHref} />}
          className="cursor-pointer px-2.5 py-2 text-foreground"
        >
          <ScrollTextIcon aria-hidden="true" />
          Regras de pontuação
        </DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
