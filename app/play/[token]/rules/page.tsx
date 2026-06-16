import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Regras de pontuação · Puras Cinderelas 2026',
}

const resultPoints = [
  { icon: '🏟️', label: 'Vitória na fase de grupos', points: 3, unit: 'pts' },
  { icon: '🤝', label: 'Empate na fase de grupos', points: 1, unit: 'pt' },
  { icon: '📋', label: 'Vitória nos 1/16 final', points: 5, unit: 'pts' },
  { icon: '👥', label: 'Vitória nos 1/8 final', points: 8, unit: 'pts' },
  { icon: '🏆', label: 'Vitória nos quartos de final', points: 12, unit: 'pts' },
  { icon: '🎖️', label: 'Vitória na meia-final', points: 15, unit: 'pts' },
  { icon: '👑', label: 'Campeão Mundial', points: 25, unit: 'pts', highlight: true },
]

const cinderelaBonus = [
  {
    pot: 'Pote 3',
    tone: 'green',
    rows: [
      ['📋', 'Dezasseis-avos de final', '+3'],
      ['👥', 'Oitavos de final', '+7'],
      ['🏆', 'Quartos de final', '+10'],
      ['🎖️', 'Meia-final', '+15'],
      ['🥇', 'Final', '+20'],
      ['👑', 'Campeão', '+25'],
    ],
  },
  {
    pot: 'Pote 4',
    tone: 'gold',
    rows: [
      ['📋', 'Dezasseis-avos de final', '+5'],
      ['👥', 'Oitavos de final', '+10'],
      ['🏆', 'Quartos de final', '+15'],
      ['🎖️', 'Meia-final', '+20'],
      ['🥇', 'Final', '+25'],
      ['👑', 'Campeão', '+30'],
    ],
  },
]

export default function ScoringRulesPage() {
  return (
    <div className="py-4 pb-6">
      <section className="mb-7 text-center">
        <span className="mb-2 block text-4xl" aria-hidden="true">⚽</span>
        <p className="text-gold text-xs font-semibold uppercase tracking-[0.28em]">
          Mundial 2026
        </p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          Regras de pontuação
        </h2>
        <p className="mx-auto mt-2 max-w-[32rem] text-sm leading-6 text-muted-foreground">
          Os pontos de cada jogador são a soma das 4 seleções. Vitórias, empates,
          progressão e bónus Cinderela acumulam ao longo do torneio.
        </p>
      </section>

      <div className="flex flex-col gap-5">
        <Card className="border border-night-border bg-night-card">
          <CardHeader className="border-b border-night-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Pontos por resultado</CardTitle>
                <CardDescription>Fase de grupos e eliminatórias</CardDescription>
              </div>
              <Badge variant="outline" className="border-gold/40 text-gold">
                Base
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col">
              {resultPoints.map(row => (
                <div
                  key={row.label}
                  className={`flex items-center gap-3 border-b border-night-border/70 px-4 py-3 last:border-b-0 ${
                    row.highlight ? 'bg-gold-muted' : ''
                  }`}
                >
                  <span className="w-8 text-center text-xl" aria-hidden="true">
                    {row.icon}
                  </span>
                  <span
                    className={`flex-1 text-sm ${
                      row.highlight ? 'font-bold text-gold' : 'font-medium text-foreground'
                    }`}
                  >
                    {row.label}
                  </span>
                  <span
                    className={`text-xl font-extrabold tabular-nums ${
                      row.highlight ? 'text-gold' : 'text-[oklch(0.78_0.12_210)]'
                    }`}
                  >
                    {row.points}
                    <span className="ml-1 align-super text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {row.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <div className="text-center">
            <span className="block text-3xl" aria-hidden="true">👑</span>
            <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-gold">
              Bónus Cinderela
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Só se aplica a seleções dos Potes 3 e 4. O bónus também é cumulativo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cinderelaBonus.map(pot => (
              <Card
                key={pot.pot}
                className={`border bg-night-card ${
                  pot.tone === 'green' ? 'border-[oklch(0.7_0.14_150/0.35)]' : 'border-gold/35'
                }`}
              >
                <CardHeader className="border-b border-night-border">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm">⚽ {pot.pot}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        pot.tone === 'green'
                          ? 'border-[oklch(0.7_0.14_150/0.45)] text-[oklch(0.75_0.15_150)]'
                          : 'border-gold/40 text-gold'
                      }
                    >
                      Extra
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  {pot.rows.map(([icon, label, points]) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 border-b border-night-border/70 px-4 py-2.5 last:border-b-0"
                    >
                      <span className="w-7 text-center text-base" aria-hidden="true">
                        {icon}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {label}
                      </span>
                      <span
                        className={`text-lg font-extrabold tabular-nums ${
                          pot.tone === 'green'
                            ? 'text-[oklch(0.75_0.15_150)]'
                            : 'text-gold'
                        }`}
                      >
                        {points}
                        <span className="ml-1 align-super text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          pts
                        </span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border border-night-border bg-night-card">
          <CardHeader>
            <CardTitle>Desempates</CardTitle>
            <CardDescription>Critérios aplicados à soma das 4 seleções</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-extrabold text-night">
                  1
                </span>
                <span className="leading-6 text-foreground">
                  Maior número de golos marcados no agregado das 4 seleções do jogador.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-extrabold text-foreground">
                  2
                </span>
                <span className="leading-6 text-foreground">
                  Menor número de golos sofridos no agregado das 4 seleções do jogador.
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
