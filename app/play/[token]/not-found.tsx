import Link from 'next/link'

export default function PlayerNotFound() {
  return (
    <div className="min-h-dvh bg-night flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-muted-foreground text-sm text-center">
        Link inválido ou expirado.
      </p>
      <Link href="/" className="text-gold text-sm underline underline-offset-4">
        Ver classificação
      </Link>
    </div>
  )
}
