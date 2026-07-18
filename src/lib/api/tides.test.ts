import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCurrentTideHeight,
  getTidePhase,
  getNextTides,
  formatTideHeight,
} from './tides'
import type { TideData } from '../../types'

// "Now" = 2026-07-13 12:30 Pacific. Tests run with TZ=America/Los_Angeles.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-13T12:30:00-07:00'))
})
afterEach(() => vi.useRealTimers())

const hourly = (h: number, height: number) => ({
  time: `2026-07-13T${String(h).padStart(2, '0')}:00:00-07:00`,
  height,
  type: null,
})

const tideData: TideData = {
  hourly: [hourly(11, 2), hourly(12, 3), hourly(13, 4)],
  highLow: [
    { time: '2026-07-13T09:00:00-07:00', height: 0.5, type: 'L' },
    { time: '2026-07-13T15:00:00-07:00', height: 5.5, type: 'H' },
    { time: '2026-07-13T21:00:00-07:00', height: 0.8, type: 'L' },
  ],
}

describe('getCurrentTideHeight', () => {
  it('linearly interpolates between the bracketing hourly readings', () => {
    // now = 12:30, halfway between 12:00 (3.0) and 13:00 (4.0)
    expect(getCurrentTideHeight(tideData)).toBeCloseTo(3.5, 5)
  })

  it('falls back to the first reading when there is no bracketing pair', () => {
    const past: TideData = { hourly: [hourly(6, 1.2)], highLow: [] }
    expect(getCurrentTideHeight(past)).toBe(1.2)
  })

  it('returns 0 for empty data', () => {
    expect(getCurrentTideHeight({ hourly: [], highLow: [] })).toBe(0)
  })
})

describe('getTidePhase', () => {
  it('reports rising after a low and before the next high', () => {
    // now 12:30 is between L@09:00 and H@15:00 -> rising
    expect(getTidePhase(tideData)).toBe('rising')
  })

  it('reports falling after a high', () => {
    vi.setSystemTime(new Date('2026-07-13T17:00:00-07:00')) // after H@15:00
    expect(getTidePhase(tideData)).toBe('falling')
  })

  it('reports high within 30 minutes of a high tide', () => {
    vi.setSystemTime(new Date('2026-07-13T14:45:00-07:00')) // 15 min before H@15:00
    expect(getTidePhase(tideData)).toBe('high')
  })
})

describe('getNextTides', () => {
  it('finds the next high and low after now', () => {
    const { nextHigh, nextLow } = getNextTides(tideData)
    expect(nextHigh?.time).toBe('2026-07-13T15:00:00-07:00')
    expect(nextLow?.time).toBe('2026-07-13T21:00:00-07:00')
  })
})

describe('formatTideHeight', () => {
  it('formats to one decimal with a ft suffix', () => {
    expect(formatTideHeight(3.25)).toBe('3.3ft')
    expect(formatTideHeight(-0.4)).toBe('-0.4ft')
  })
})
