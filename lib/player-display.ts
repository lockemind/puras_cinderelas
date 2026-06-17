import type { Player } from '@/lib/types'

export function getPlayerDisplayName(player: Pick<Player, 'name' | 'is_guest'>) {
  return player.is_guest ? 'Convidado' : player.name
}
