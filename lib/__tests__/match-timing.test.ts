import { describe, it, expect } from 'vitest'
import {
  estimateMatchTiming,
  type MatchTimingConfig,
} from '../match-timing'

const KICKOFF = '2026-06-15T18:00:00Z'
const kickoffMs = new Date(KICKOFF).getTime()
const atMinute = (min: number) => kickoffMs + min * 60_000

describe('estimateMatchTiming', () => {
  it('NOT_STARTED before kickoff', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(-10))
    expect(result.estimatedPhase).toBe('NOT_STARTED')
    expect(result.estimatedMatchMinute).toBeNull()
    expect(result.confidence).toBe('high')
    expect(result.isEstimated).toBe(true)
  })

  it('FIRST_HALF at kickoff', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(0))
    expect(result.estimatedPhase).toBe('FIRST_HALF')
    expect(result.estimatedMatchMinute).toBe(1)
    expect(result.displayLabel).toMatch(/~1'/)
  })

  it('FIRST_HALF at 25 real minutes', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(25))
    expect(result.estimatedPhase).toBe('FIRST_HALF')
    expect(result.estimatedMatchMinute).toBe(25)
    expect(result.confidence).toBe('high')
  })

  it('FIRST_HALF confidence drops near boundary', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(44))
    expect(result.estimatedPhase).toBe('FIRST_HALF')
    expect(result.confidence).toBe('medium')
  })

  it('FIRST_HALF caps match minute at 45', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(48))
    expect(result.estimatedPhase).toBe('FIRST_HALF')
    expect(result.estimatedMatchMinute).toBe(45)
    expect(result.displayLabel).toBe("~45'+")
  })

  it('HALF_TIME at 50 real minutes', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(50))
    expect(result.estimatedPhase).toBe('HALF_TIME')
    expect(result.estimatedMatchMinute).toBe(45)
    expect(result.displayLabel).toBe('INT')
    expect(result.confidence).toBe('medium')
  })

  it('HALF_TIME persists until second half start', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(60))
    expect(result.estimatedPhase).toBe('HALF_TIME')
  })

  it('SECOND_HALF starts at 65 real minutes', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(65))
    expect(result.estimatedPhase).toBe('SECOND_HALF')
    expect(result.estimatedMatchMinute).toBe(46)
  })

  it('SECOND_HALF midpoint shows reasonable minute', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(85))
    expect(result.estimatedPhase).toBe('SECOND_HALF')
    expect(result.estimatedMatchMinute).toBeGreaterThanOrEqual(60)
    expect(result.estimatedMatchMinute).toBeLessThanOrEqual(75)
  })

  it('SECOND_HALF caps at 90', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(103))
    expect(result.estimatedPhase).toBe('SECOND_HALF')
    expect(result.estimatedMatchMinute).toBeLessThanOrEqual(90)
  })

  it('SECOND_HALF confidence drops near full-time boundary', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(101))
    expect(result.estimatedPhase).toBe('SECOND_HALF')
    expect(result.confidence).toBe('low')
  })

  it('FULL_TIME_EXPECTED at 105 real minutes', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(105))
    expect(result.estimatedPhase).toBe('FULL_TIME_EXPECTED')
    expect(result.estimatedMatchMinute).toBe(90)
    expect(result.displayLabel).toBe("~90'+")
    expect(result.confidence).toBe('low')
  })

  it('FULL_TIME_EXPECTED persists until grace period ends', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(114))
    expect(result.estimatedPhase).toBe('FULL_TIME_EXPECTED')
  })

  it('FINISHED after grace period', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(115))
    expect(result.estimatedPhase).toBe('FINISHED')
    expect(result.displayLabel).toBe('FT')
    expect(result.confidence).toBe('low')
  })

  it('FINISHED well after the match', () => {
    const result = estimateMatchTiming(KICKOFF, atMinute(200))
    expect(result.estimatedPhase).toBe('FINISHED')
  })

  it('all estimates have isEstimated: true', () => {
    const times = [-5, 0, 25, 50, 65, 85, 105, 115, 200]
    for (const t of times) {
      expect(estimateMatchTiming(KICKOFF, atMinute(t)).isEstimated).toBe(true)
    }
  })

  it('all estimates have an explanation', () => {
    const times = [-5, 0, 25, 50, 65, 85, 105, 115, 200]
    for (const t of times) {
      const { explanation } = estimateMatchTiming(KICKOFF, atMinute(t))
      expect(explanation.length).toBeGreaterThan(0)
    }
  })

  it('displayLabel uses ~ prefix for estimated minutes', () => {
    const firstHalf = estimateMatchTiming(KICKOFF, atMinute(20))
    expect(firstHalf.displayLabel).toMatch(/^~/)

    const secondHalf = estimateMatchTiming(KICKOFF, atMinute(80))
    expect(secondHalf.displayLabel).toMatch(/^~/)
  })

  describe('custom config', () => {
    const fast: MatchTimingConfig = {
      firstHalfRealMinutes: 46,
      halfTimeMinutes: 12,
      secondHalfRealMinutes: 46,
      fullTimeGraceMinutes: 5,
    }

    it('respects custom first half duration', () => {
      const result = estimateMatchTiming(KICKOFF, atMinute(47), fast)
      expect(result.estimatedPhase).toBe('HALF_TIME')
    })

    it('respects custom half-time duration', () => {
      const result = estimateMatchTiming(KICKOFF, atMinute(58), fast)
      expect(result.estimatedPhase).toBe('SECOND_HALF')
    })

    it('respects custom full-time grace', () => {
      // fast config: 46 + 12 + 46 = 104 full-time, + 5 grace = 109
      const result = estimateMatchTiming(KICKOFF, atMinute(109), fast)
      expect(result.estimatedPhase).toBe('FINISHED')
    })
  })

  describe('phase transitions are contiguous', () => {
    it('covers every minute from -1 to 120 without gaps', () => {
      const phases: string[] = []
      for (let m = -1; m <= 120; m++) {
        phases.push(estimateMatchTiming(KICKOFF, atMinute(m)).estimatedPhase)
      }
      const validPhases = new Set([
        'NOT_STARTED',
        'FIRST_HALF',
        'HALF_TIME',
        'SECOND_HALF',
        'FULL_TIME_EXPECTED',
        'FINISHED',
      ])
      for (const p of phases) {
        expect(validPhases.has(p)).toBe(true)
      }
    })

    it('phases only move forward, never backward', () => {
      const order = [
        'NOT_STARTED',
        'FIRST_HALF',
        'HALF_TIME',
        'SECOND_HALF',
        'FULL_TIME_EXPECTED',
        'FINISHED',
      ]
      let maxIdx = 0
      for (let m = -1; m <= 120; m++) {
        const idx = order.indexOf(
          estimateMatchTiming(KICKOFF, atMinute(m)).estimatedPhase,
        )
        expect(idx).toBeGreaterThanOrEqual(maxIdx)
        maxIdx = idx
      }
    })
  })
})
