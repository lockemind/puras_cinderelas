import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">Página não encontrada</p>
      <Link
        href="/"
        className="text-gold text-sm underline underline-offset-4"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
