/**
 * Multi-day forecast utilities
 * Note: NOAA buoy data is real-time only, so wave "forecast" uses current conditions as baseline
 * Tide forecasts are accurate predictions from NOAA
 */

import type { TideData, SpotConfig } from '../types'
import { getSunTimes } from './sun'
import { getMoonPhase } from './moon'

export interface DayForecast {
  date: Date
  dayName: string
  dateStr: string
  tideData?: TideData
  sunTimes: ReturnType<typeof getSunTimes>
  moonPhase: ReturnType<typeof getMoonPhase>
  score: number
  analysis: string
  bestTimeWindow?: { start: string; end: string }
}

export interface WeekForecast {
  days: DayForecast[]
  bestDay: DayForecast | null
  bestDayReason: string
}

/**
 * Analyze a week of conditions and find the best day
 */
export function analyzeWeek(
  tideDataByDay: Map<string, TideData>,
  spot: SpotConfig,
  startDate: Date = new Date()
): WeekForecast {
  const days: DayForecast[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    date.setHours(12, 0, 0, 0)

    const dateKey = formatDateKey(date)
    const tideData = tideDataByDay.get(dateKey)

    const sunTimes = getSunTimes(spot.coordinates.lat, spot.coordinates.lng, date)
    const moonPhase = getMoonPhase(date)

    // Score the day based on tide patterns and typical conditions
    const { score, analysis, bestTimeWindow } = scoreDayConditions(date, tideData, spot, sunTimes)

    days.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tideData,
      sunTimes,
      moonPhase,
      score,
      analysis,
      bestTimeWindow,
    })
  }

  // Find best day
  let bestDay: DayForecast | null = null
  let bestScore = -1

  for (const day of days) {
    if (day.score > bestScore) {
      bestScore = day.score
      bestDay = day
    }
  }

  const bestDayReason = bestDay
    ? generateBestDayReason(bestDay, days)
    : 'Unable to determine best day'

  return { days, bestDay, bestDayReason }
}

/**
 * Score a day's conditions based on tide patterns
 */
function scoreDayConditions(
  date: Date,
  tideData: TideData | undefined,
  spot: SpotConfig,
  _sunTimes: ReturnType<typeof getSunTimes>
): { score: number; analysis: string; bestTimeWindow?: { start: string; end: string } } {
  let score = 50 // Base score

  if (!tideData) {
    return { score: 50, analysis: 'Tide data unavailable' }
  }

  const analysisPoints: string[] = []
  let bestTimeWindow: { start: string; end: string } | undefined

  // Analyze tide patterns during surfable hours (6am - 6pm)
  const surfableHours = tideData.hourly.filter((t) => {
    const hour = new Date(t.time).getHours()
    return hour >= 6 && hour <= 18
  })

  // Find hours with ideal tide for this spot
  const idealTideHours: number[] = []
  for (const t of surfableHours) {
    const hour = new Date(t.time).getHours()
    const isIdeal = isTideIdealForSpot(t.height, spot.bestTide)
    if (isIdeal) {
      idealTideHours.push(hour)
    }
  }

  // Score based on how many good hours overlap with dawn patrol (6-9am)
  const dawnPatrolGoodHours = idealTideHours.filter((h) => h >= 6 && h <= 9).length
  if (dawnPatrolGoodHours >= 2) {
    score += 25
    analysisPoints.push('Great early morning tide')
  } else if (dawnPatrolGoodHours >= 1) {
    score += 15
    analysisPoints.push('Good dawn patrol window')
  }

  // Score based on total good hours
  if (idealTideHours.length >= 6) {
    score += 20
    analysisPoints.push('Extended surf window')
  } else if (idealTideHours.length >= 3) {
    score += 10
  }

  // Weekend bonus (people have more flexibility)
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    score += 5
    analysisPoints.push('Weekend')
  }

  // Check for extreme tides (could be problematic)
  const highLows = tideData.highLow
  const maxTide = Math.max(...highLows.map((t) => t.height))
  const minTide = Math.min(...highLows.map((t) => t.height))

  if (maxTide > 6) {
    score -= 10
    analysisPoints.push('Very high tide')
  }
  if (minTide < -0.5) {
    score -= 5
    analysisPoints.push('Negative low tide')
  }

  // Find best time window
  if (idealTideHours.length > 0) {
    // Find consecutive ideal hours
    let bestStart = idealTideHours[0]
    let bestEnd = idealTideHours[0]
    let currentStart = idealTideHours[0]

    for (let i = 1; i < idealTideHours.length; i++) {
      if (idealTideHours[i] === idealTideHours[i - 1] + 1) {
        // Consecutive
        if (idealTideHours[i] - currentStart > bestEnd - bestStart) {
          bestStart = currentStart
          bestEnd = idealTideHours[i]
        }
      } else {
        currentStart = idealTideHours[i]
      }
    }

    bestTimeWindow = {
      start: formatHour(bestStart),
      end: formatHour(Math.min(bestEnd + 1, 20)),
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  const analysis = analysisPoints.length > 0
    ? analysisPoints.join(' • ')
    : 'Average conditions expected'

  return { score, analysis, bestTimeWindow }
}

/**
 * Check if tide height is ideal for a spot
 */
function isTideIdealForSpot(height: number, bestTide: 'low' | 'mid' | 'high' | 'any'): boolean {
  if (bestTide === 'any') return true

  // SF Bay typical range: -1 to 6ft
  switch (bestTide) {
    case 'low':
      return height < 2
    case 'mid':
      return height >= 1.5 && height <= 4
    case 'high':
      return height > 3.5
  }
}

/**
 * Generate reason why a day is the best
 */
function generateBestDayReason(bestDay: DayForecast, allDays: DayForecast[]): string {
  const parts: string[] = []

  parts.push(`${bestDay.dayName} ${bestDay.dateStr}`)

  if (bestDay.analysis) {
    parts.push(bestDay.analysis.toLowerCase())
  }

  if (bestDay.bestTimeWindow) {
    parts.push(`best from ${bestDay.bestTimeWindow.start} to ${bestDay.bestTimeWindow.end}`)
  }

  // Compare to other days
  const avgScore = allDays.reduce((sum, d) => sum + d.score, 0) / allDays.length
  if (bestDay.score > avgScore + 15) {
    parts.push('significantly better than other days')
  }

  return parts.join(' — ')
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/**
 * Get dates for the next N days
 */
export function getNextDays(count: number, startDate: Date = new Date()): Date[] {
  const days: Date[] = []
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    days.push(date)
  }
  return days
}

/**
 * Format date for API calls (YYYYMMDD)
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
