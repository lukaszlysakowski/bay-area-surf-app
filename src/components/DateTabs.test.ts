import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getDateForOption,
  getDateOptionForDate,
  formatDateForAPI,
} from './DateTabs'

// Format a Date as its local YYYY-MM-DD for stable assertions.
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Anchor "now" to Monday 2026-07-13, noon Pacific. Tests run with
// TZ=America/Los_Angeles (see package.json), so local day-of-week is stable.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-13T12:00:00-07:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getDateForOption', () => {
  it('resolves now/today to the current day', () => {
    expect(ymd(getDateForOption('now'))).toBe('2026-07-13')
    expect(ymd(getDateForOption('today'))).toBe('2026-07-13')
  })

  it('resolves tomorrow', () => {
    expect(ymd(getDateForOption('tomorrow'))).toBe('2026-07-14')
  })

  it('resolves the upcoming Thursday', () => {
    // From Monday, the next Thursday is 3 days out.
    expect(ymd(getDateForOption('thursday'))).toBe('2026-07-16')
  })

  it('resolves Friday, Saturday and Sunday to the coming weekend', () => {
    expect(ymd(getDateForOption('friday'))).toBe('2026-07-17')
    expect(ymd(getDateForOption('saturday'))).toBe('2026-07-18')
    expect(ymd(getDateForOption('sunday'))).toBe('2026-07-19')
  })
})

describe('getDateOptionForDate', () => {
  it('maps today and tomorrow', () => {
    expect(getDateOptionForDate(new Date(2026, 6, 13))).toBe('today')
    expect(getDateOptionForDate(new Date(2026, 6, 14))).toBe('tomorrow')
  })

  it('maps the upcoming Thursday to "thursday"', () => {
    expect(getDateOptionForDate(new Date(2026, 6, 16))).toBe('thursday')
  })

  it('maps Friday and Sunday', () => {
    expect(getDateOptionForDate(new Date(2026, 6, 17))).toBe('friday')
    expect(getDateOptionForDate(new Date(2026, 6, 19))).toBe('sunday')
  })

  it('returns null for a date outside the selectable window', () => {
    // More than 7 days out.
    expect(getDateOptionForDate(new Date(2026, 6, 30))).toBeNull()
  })
})

describe('getDateOptionForDate — Thursday only when it is not today/tomorrow', () => {
  it('does not classify Thursday when today IS Thursday', () => {
    vi.setSystemTime(new Date('2026-07-16T12:00:00-07:00')) // a Thursday
    // "Today" wins; the same date is today, not the "thursday" tab.
    expect(getDateOptionForDate(new Date(2026, 6, 16))).toBe('today')
  })
})

describe('formatDateForAPI', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(formatDateForAPI(new Date(2026, 6, 16))).toBe('20260716')
    expect(formatDateForAPI(new Date(2026, 0, 5))).toBe('20260105')
  })
})
