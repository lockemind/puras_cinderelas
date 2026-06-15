export type EstimatedPhase =
  | 'NOT_STARTED'
  | 'FIRST_HALF'
  | 'HALF_TIME'
  | 'SECOND_HALF'
  | 'FULL_TIME_EXPECTED'
  | 'FINISHED'

export type MatchTimingConfig = {
  firstHalfRealMinutes: number
  halfTimeMinutes: number
  secondHalfRealMinutes: number
  fullTimeGraceMinutes: number
}

export type MatchEstimate = {
  estimatedPhase: EstimatedPhase
  estimatedMatchMinute: number | null
  displayLabel: string
  confidence: 'high' | 'medium' | 'low'
  isEstimated: true
  explanation: string
}

export const MATCH_TIMING: MatchTimingConfig = {
  firstHalfRealMinutes: 50,
  halfTimeMinutes: 15,
  secondHalfRealMinutes: 40,
  fullTimeGraceMinutes: 10,
}

export function estimateMatchTiming(
  utcDate: string,
  now: number,
  config: MatchTimingConfig = MATCH_TIMING,
): MatchEstimate {
  const kickoff = new Date(utcDate).getTime()
  const elapsed = (now - kickoff) / 60_000

  const halfTimeStart = config.firstHalfRealMinutes
  const secondHalfStart = halfTimeStart + config.halfTimeMinutes
  const fullTimeExpected = secondHalfStart + config.secondHalfRealMinutes
  const likelyFinished = fullTimeExpected + config.fullTimeGraceMinutes

  if (elapsed < 0) {
    return {
      estimatedPhase: 'NOT_STARTED',
      estimatedMatchMinute: null,
      displayLabel: '',
      confidence: 'high',
      isEstimated: true,
      explanation: 'Jogo ainda não começou',
    }
  }

  if (elapsed < halfTimeStart) {
    const minute = Math.max(1, Math.round(elapsed))
    const capped = Math.min(minute, 45)
    return {
      estimatedPhase: 'FIRST_HALF',
      estimatedMatchMinute: capped,
      displayLabel: capped >= 45 ? "~45'+" : `~${capped}'`,
      confidence: elapsed > 43 ? 'medium' : 'high',
      isEstimated: true,
      explanation: 'Estimado a partir da hora de início',
    }
  }

  if (elapsed < secondHalfStart) {
    return {
      estimatedPhase: 'HALF_TIME',
      estimatedMatchMinute: 45,
      displayLabel: 'INT',
      confidence: 'medium',
      isEstimated: true,
      explanation: 'Intervalo estimado a partir da hora de início',
    }
  }

  if (elapsed < fullTimeExpected) {
    const secondHalfElapsed = elapsed - secondHalfStart
    const minute = Math.round(
      46 + secondHalfElapsed * (44 / config.secondHalfRealMinutes),
    )
    const capped = Math.min(minute, 90)
    return {
      estimatedPhase: 'SECOND_HALF',
      estimatedMatchMinute: capped,
      displayLabel: capped >= 90 ? "~90'+" : `~${capped}'`,
      confidence: elapsed > fullTimeExpected - 5 ? 'low' : 'medium',
      isEstimated: true,
      explanation: 'Estimado a partir da hora de início',
    }
  }

  if (elapsed < likelyFinished) {
    return {
      estimatedPhase: 'FULL_TIME_EXPECTED',
      estimatedMatchMinute: 90,
      displayLabel: "~90'+",
      confidence: 'low',
      isEstimated: true,
      explanation: 'Fim de jogo esperado por volta deste período',
    }
  }

  return {
    estimatedPhase: 'FINISHED',
    estimatedMatchMinute: 90,
    displayLabel: 'FT',
    confidence: 'low',
    isEstimated: true,
    explanation: 'Provavelmente terminado com base no tempo decorrido',
  }
}
