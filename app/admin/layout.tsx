export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-night p-4 pb-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-gold font-bold tracking-widest uppercase text-sm">
            Puras Cinderelas 2026
          </h1>
          <p className="text-muted-foreground text-xs">Painel de Administração</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto space-y-6">{children}</main>
    </div>
  )
}
