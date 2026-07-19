import { describe, it, expect } from 'vitest'
import { getBestReachableSpot } from './reachable'

const spots = [
  { id: 'far-epic', score: 95 },
  { id: 'near-good', score: 80 },
  { id: 'near-ok', score: 60 },
]

const driveTimes = new Map([
  ['far-epic', { minutes: 90 }],
  ['near-good', { minutes: 25 }],
  ['near-ok', { minutes: 10 }],
])

describe('getBestReachableSpot', () => {
  it('returns the highest-scored spot within the budget', () => {
    // 30-min budget excludes far-epic (90) -> near-good is the best reachable.
    expect(getBestReachableSpot(spots, driveTimes, 30)?.id).toBe('near-good')
  })

  it('returns the overall best when the budget covers it', () => {
    expect(getBestReachableSpot(spots, driveTimes, 120)?.id).toBe('far-epic')
  })

  it('falls back to the only spot inside a tight budget', () => {
    expect(getBestReachableSpot(spots, driveTimes, 15)?.id).toBe('near-ok')
  })

  it('returns null when nothing is reachable', () => {
    expect(getBestReachableSpot(spots, driveTimes, 5)).toBeNull()
  })

  it('sorts by score internally, so input order does not matter', () => {
    const shuffled = [spots[2], spots[0], spots[1]]
    expect(getBestReachableSpot(shuffled, driveTimes, 30)?.id).toBe('near-good')
  })

  it('ignores spots missing from the drive-time map', () => {
    const partial = new Map([['near-ok', { minutes: 10 }]])
    expect(getBestReachableSpot(spots, partial, 60)?.id).toBe('near-ok')
  })

  it('treats the budget as inclusive', () => {
    expect(getBestReachableSpot(spots, driveTimes, 25)?.id).toBe('near-good')
  })
})
