/**
 * Moon phase calculations
 */

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent'

export interface MoonInfo {
  phase: MoonPhase
  illumination: number // 0-100
  emoji: string
  name: string
}

/**
 * Calculate moon phase for a given date
 * Based on a known new moon date and the synodic month length
 */
export function getMoonPhase(date: Date): MoonInfo {
  // Known new moon: January 11, 2024 at 11:57 UTC
  const knownNewMoon = new Date('2024-01-11T11:57:00Z')
  const synodicMonth = 29.53058867 // days

  const daysSinceNewMoon = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
  const lunarAge = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth

  // Calculate illumination (approximate)
  const illumination = Math.round((1 - Math.cos((lunarAge / synodicMonth) * 2 * Math.PI)) / 2 * 100)

  // Determine phase based on lunar age
  const phaseIndex = Math.floor((lunarAge / synodicMonth) * 8)

  const phases: Array<{ phase: MoonPhase; emoji: string; name: string }> = [
    { phase: 'new', emoji: '🌑', name: 'New Moon' },
    { phase: 'waxing-crescent', emoji: '🌒', name: 'Waxing Crescent' },
    { phase: 'first-quarter', emoji: '🌓', name: 'First Quarter' },
    { phase: 'waxing-gibbous', emoji: '🌔', name: 'Waxing Gibbous' },
    { phase: 'full', emoji: '🌕', name: 'Full Moon' },
    { phase: 'waning-gibbous', emoji: '🌖', name: 'Waning Gibbous' },
    { phase: 'last-quarter', emoji: '🌗', name: 'Last Quarter' },
    { phase: 'waning-crescent', emoji: '🌘', name: 'Waning Crescent' },
  ]

  const phaseInfo = phases[phaseIndex % 8]

  return {
    ...phaseInfo,
    illumination,
  }
}

/**
 * Get all moon phases for a month
 */
export function getMonthMoonPhases(year: number, month: number): Map<number, MoonInfo> {
  const phases = new Map<number, MoonInfo>()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12, 0, 0)
    phases.set(day, getMoonPhase(date))
  }

  return phases
}

/**
 * Check if it's a significant moon phase (new, full, quarters)
 */
export function isSignificantPhase(phase: MoonPhase): boolean {
  return ['new', 'full', 'first-quarter', 'last-quarter'].includes(phase)
}
