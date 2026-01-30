import type { SurfConditions, SpotConfig, ScoreResult, SkillConfig, TideData } from '../types'
import { normalizeAngle } from './utils'

// Skill configurations for wave height preferences
// Each surfer type + skill level has ideal and surfable wave height ranges
const SKILL_CONFIGS: Record<string, Record<string, SkillConfig>> = {
  longboard: {
    beginner: { minIdeal: 1.5, maxIdeal: 3, minSurfable: 1, maxSurfable: 5 },
    advanced: { minIdeal: 2, maxIdeal: 5, minSurfable: 1.5, maxSurfable: 7 },
    expert: { minIdeal: 3, maxIdeal: 6, minSurfable: 2, maxSurfable: 10 },
  },
  mediumboard: {
    beginner: { minIdeal: 2, maxIdeal: 4, minSurfable: 1.5, maxSurfable: 6 },
    advanced: { minIdeal: 3, maxIdeal: 6, minSurfable: 2, maxSurfable: 8 },
    expert: { minIdeal: 4, maxIdeal: 8, minSurfable: 2.5, maxSurfable: 12 },
  },
  shortboard: {
    beginner: { minIdeal: 2.5, maxIdeal: 4, minSurfable: 2, maxSurfable: 6 },
    advanced: { minIdeal: 3, maxIdeal: 7, minSurfable: 2.5, maxSurfable: 10 },
    expert: { minIdeal: 4, maxIdeal: 10, minSurfable: 3, maxSurfable: 15 },
  },
}

/**
 * Scores wave height based on surfer type and skill level
 * Weight: 30%
 */
export function scoreWaveHeight(
  height: number,
  surferType: string,
  skillLevel: string
): number {
  const config = SKILL_CONFIGS[surferType]?.[skillLevel]
  if (!config) return 50 // Default if config not found

  // Perfect conditions - within ideal range
  if (height >= config.minIdeal && height <= config.maxIdeal) {
    return 100
  }

  // Below ideal but surfable
  if (height >= config.minSurfable && height < config.minIdeal) {
    const range = config.minIdeal - config.minSurfable
    const diff = config.minIdeal - height
    return Math.round(100 - (diff / range) * 40) // 60-100 range
  }

  // Above ideal but surfable
  if (height > config.maxIdeal && height <= config.maxSurfable) {
    const range = config.maxSurfable - config.maxIdeal
    const diff = height - config.maxIdeal
    return Math.round(100 - (diff / range) * 50) // 50-100 range
  }

  // Too small
  if (height < config.minSurfable) {
    return Math.max(0, Math.round((height / config.minSurfable) * 30))
  }

  // Too big
  if (height > config.maxSurfable) {
    return Math.max(0, Math.round(30 - (height - config.maxSurfable) * 10))
  }

  return 0
}

/**
 * Scores wave period - longer periods = better, more organized waves
 * Weight: 20%
 *
 * < 8s: Wind swell, choppy (poor)
 * 8-10s: Mixed, less organized (fair)
 * 11-14s: Good groundswell (good)
 * 15+s: Long-period groundswell (excellent)
 */
export function scoreWavePeriod(period: number): number {
  if (period >= 15) return 100
  if (period >= 13) return 90
  if (period >= 11) return 75
  if (period >= 9) return 55
  if (period >= 7) return 35
  return 20
}

/**
 * Scores wind conditions - lower wind = cleaner conditions
 * Wind direction relative to offshore also matters
 * Weight: 20% (speed) + 10% (direction component)
 */
export function scoreWind(
  speed: number,
  direction: number,
  spotOffshoreDirection: number
): number {
  // Wind speed score (lower = better)
  let speedScore: number
  if (speed < 5) speedScore = 100 // Glassy
  else if (speed < 10) speedScore = 85 // Light
  else if (speed < 15) speedScore = 65 // Moderate
  else if (speed < 20) speedScore = 40 // Strong
  else if (speed < 25) speedScore = 20 // Very strong
  else speedScore = 5 // Howling

  // Wind direction score - how close to offshore?
  const angleDiff = Math.abs(normalizeAngle(direction - spotOffshoreDirection))

  let directionMultiplier: number
  if (angleDiff <= 45) {
    // Offshore (best) - wind blowing from land to sea
    directionMultiplier = 1.0
  } else if (angleDiff <= 90) {
    // Cross-offshore
    directionMultiplier = 0.85
  } else if (angleDiff <= 135) {
    // Cross-onshore
    directionMultiplier = 0.6
  } else {
    // Onshore (worst) - wind blowing from sea to land
    directionMultiplier = 0.4
  }

  // Light winds matter less for direction
  if (speed < 5) {
    directionMultiplier = Math.max(0.9, directionMultiplier)
  }

  return Math.round(speedScore * directionMultiplier)
}

/**
 * Scores swell direction based on spot's optimal directions
 * Weight: 15%
 */
export function scoreSwellDirection(
  swellDirection: number,
  spotOptimalDirections: number[]
): number {
  // Find closest optimal direction
  let minDiff = 180
  for (const optimal of spotOptimalDirections) {
    const diff = Math.abs(normalizeAngle(swellDirection - optimal))
    minDiff = Math.min(minDiff, diff)
  }

  if (minDiff <= 15) return 100 // Direct hit
  if (minDiff <= 30) return 85 // Very good
  if (minDiff <= 45) return 70 // Good
  if (minDiff <= 60) return 50 // Fair
  if (minDiff <= 90) return 30 // Poor
  return 10 // Wrong direction
}

/**
 * Scores tide conditions based on spot's preferred tide
 * Weight: 5%
 */
export function scoreTide(
  currentTideHeight: number,
  _tidePhase: 'rising' | 'falling' | 'high' | 'low',
  spotBestTide: 'low' | 'mid' | 'high' | 'any'
): number {
  if (spotBestTide === 'any') return 80 // Neutral score

  // Estimate tide level (0-6ft typical range for SF Bay)
  const tidePct = Math.min(1, Math.max(0, currentTideHeight / 6))

  switch (spotBestTide) {
    case 'low':
      if (tidePct < 0.33) return 100
      if (tidePct < 0.5) return 75
      if (tidePct < 0.67) return 50
      return 30

    case 'mid':
      if (tidePct >= 0.33 && tidePct <= 0.67) return 100
      if (tidePct >= 0.2 && tidePct <= 0.8) return 75
      return 50

    case 'high':
      if (tidePct > 0.67) return 100
      if (tidePct > 0.5) return 75
      if (tidePct > 0.33) return 50
      return 30
  }

  return 50
}

/**
 * Calculates the overall score for a surf spot
 *
 * Weights:
 * - Wave Height: 30%
 * - Wave Period: 20%
 * - Wind Speed: 20%
 * - Swell Direction: 15%
 * - Wind Direction: 10%
 * - Tide Phase: 5%
 */
export function calculateSpotScore(
  conditions: SurfConditions,
  spot: SpotConfig,
  prefs: { surferType: string; skillLevel: string }
): ScoreResult {
  const waveHeightScore = scoreWaveHeight(
    conditions.waveHeight,
    prefs.surferType,
    prefs.skillLevel
  )

  const wavePeriodScore = scoreWavePeriod(conditions.wavePeriod)

  const windScore = scoreWind(
    conditions.windSpeed,
    conditions.windDirection,
    spot.offshoreWindDirection
  )

  const swellScore = scoreSwellDirection(
    conditions.swellDirection,
    spot.optimalSwellDirections
  )

  const tideScore = scoreTide(
    conditions.tideHeight,
    conditions.tidePhase,
    spot.bestTide
  )

  // Weighted average
  const score = Math.round(
    waveHeightScore * 0.3 +
      wavePeriodScore * 0.2 +
      windScore * 0.2 +
      swellScore * 0.15 +
      windScore * 0.1 + // Wind direction component (included in windScore)
      tideScore * 0.05
  )

  // Clamp to 0-100
  const clampedScore = Math.min(100, Math.max(0, score))

  // Generate rating
  let rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  if (clampedScore >= 80) rating = 'Excellent'
  else if (clampedScore >= 60) rating = 'Good'
  else if (clampedScore >= 40) rating = 'Fair'
  else rating = 'Poor'

  // Generate breakdown text
  const breakdown = generateBreakdownText(
    conditions,
    prefs,
    waveHeightScore,
    wavePeriodScore,
    windScore,
    swellScore
  )

  return { score: clampedScore, rating, breakdown }
}

/**
 * Generates human-readable breakdown of the score
 */
function generateBreakdownText(
  conditions: SurfConditions,
  prefs: { surferType: string; skillLevel: string },
  waveScore: number,
  periodScore: number,
  _windScore: number,
  swellScore: number
): string {
  const parts: string[] = []

  // Wave assessment
  if (waveScore >= 80) {
    parts.push(
      `Excellent wave size (${conditions.waveHeight.toFixed(1)}ft) for ${prefs.skillLevel} ${prefs.surferType} surfers.`
    )
  } else if (waveScore >= 60) {
    parts.push(
      `Good wave size (${conditions.waveHeight.toFixed(1)}ft) for developing skills.`
    )
  } else if (conditions.waveHeight > 6) {
    parts.push(
      `Large waves (${conditions.waveHeight.toFixed(1)}ft) - challenging for most surfers.`
    )
  } else if (conditions.waveHeight < 2) {
    parts.push(
      `Small waves (${conditions.waveHeight.toFixed(1)}ft) - may be underwhelming.`
    )
  } else {
    parts.push(`Waves at ${conditions.waveHeight.toFixed(1)}ft.`)
  }

  // Period assessment
  if (periodScore >= 75) {
    parts.push(
      `Good wave period (${conditions.wavePeriod.toFixed(1)}s) indicates organized groundswell.`
    )
  } else if (periodScore <= 35) {
    parts.push(
      `Short period (${conditions.wavePeriod.toFixed(1)}s) suggests wind swell - expect choppier conditions.`
    )
  }

  // Wind assessment
  if (conditions.windSpeed < 5) {
    parts.push('Light winds with glassy conditions.')
  } else if (conditions.windSpeed < 10) {
    parts.push(`Light winds (${Math.round(conditions.windSpeed)}mph) with clean conditions.`)
  } else if (conditions.windSpeed < 15) {
    parts.push(
      `Moderate winds (${Math.round(conditions.windSpeed)}mph) with manageable texture.`
    )
  } else {
    parts.push(
      `Strong winds (${Math.round(conditions.windSpeed)}mph) creating challenging conditions.`
    )
  }

  // Swell direction assessment
  if (swellScore >= 85) {
    parts.push('Swell direction is ideal for this spot.')
  } else if (swellScore <= 30) {
    parts.push('Swell direction is not optimal for this spot.')
  }

  return parts.join(' ')
}

/**
 * Scores multiple spots and returns them sorted by score
 */
export function scoreAndRankSpots(
  spots: SpotConfig[],
  conditionsMap: Map<string, SurfConditions>,
  prefs: { surferType: string; skillLevel: string }
): Array<SpotConfig & ScoreResult> {
  const scoredSpots = spots.map((spot) => {
    const conditions = conditionsMap.get(spot.id)
    if (!conditions) {
      return {
        ...spot,
        score: 0,
        rating: 'Poor' as const,
        breakdown: 'No conditions data available.',
      }
    }

    const result = calculateSpotScore(conditions, spot, prefs)
    return { ...spot, ...result }
  })

  // Sort by score descending
  return scoredSpots.sort((a, b) => b.score - a.score)
}

/**
 * Gets the ideal wave height range for a surfer
 */
export function getIdealWaveRange(
  surferType: string,
  skillLevel: string
): { min: number; max: number } {
  const config = SKILL_CONFIGS[surferType]?.[skillLevel]
  if (!config) return { min: 2, max: 5 }
  return { min: config.minIdeal, max: config.maxIdeal }
}

/**
 * Gets a description of conditions quality
 */
export function getConditionsQuality(score: number): string {
  if (score >= 90) return 'Epic conditions'
  if (score >= 80) return 'Excellent conditions'
  if (score >= 70) return 'Very good conditions'
  if (score >= 60) return 'Good conditions'
  if (score >= 50) return 'Fair conditions'
  if (score >= 40) return 'Below average'
  if (score >= 30) return 'Poor conditions'
  return 'Not recommended'
}

/**
 * Calculates the best time window for surfing based on tide and wind patterns
 *
 * Factors considered:
 * - Tide: Favorable tide height for the spot's preference (low/mid/high)
 * - Wind: Early morning (5-9am) typically has calmest winds
 * - Evening glass-off (4-7pm) is secondary option
 *
 * Returns: { start: "6:00 AM", end: "9:00 AM", reason: "Low tide + light winds" }
 */
export function calculateBestTimeWindow(
  tideData: TideData,
  spotBestTide: 'low' | 'mid' | 'high' | 'any'
): { start: string; end: string; reason: string } | null {
  if (!tideData.hourly || tideData.hourly.length === 0) {
    return null
  }

  // Score each hour of the day
  const hourlyScores: Array<{ hour: number; score: number; tideHeight: number }> = []

  // Filter to today's data only (5am to 8pm surfable hours)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  for (const prediction of tideData.hourly) {
    const time = new Date(prediction.time)

    // Only consider today and surfable hours (5am - 8pm)
    if (time < today || time >= tomorrow) continue
    const hour = time.getHours()
    if (hour < 5 || hour > 20) continue

    let score = 0
    const tideHeight = prediction.height

    // Tide score (0-50 points)
    const tideScore = scoreTideForWindow(tideHeight, spotBestTide)
    score += tideScore * 0.5

    // Wind pattern score (0-50 points)
    // Early morning (5-9am) = best winds (50 pts)
    // Late morning (9-11am) = good winds (35 pts)
    // Midday (11am-3pm) = worst winds (10 pts)
    // Late afternoon (3-5pm) = building (20 pts)
    // Evening glass-off (5-7pm) = good winds (40 pts)
    // After 7pm = fading light (25 pts)
    let windScore: number
    if (hour >= 5 && hour < 9) {
      windScore = 50 // Dawn patrol - best winds
    } else if (hour >= 9 && hour < 11) {
      windScore = 35 // Late morning - still decent
    } else if (hour >= 11 && hour < 15) {
      windScore = 10 // Midday - typically windiest
    } else if (hour >= 15 && hour < 17) {
      windScore = 20 // Afternoon - winds often building
    } else if (hour >= 17 && hour < 19) {
      windScore = 40 // Evening glass-off
    } else {
      windScore = 25 // Early or late - light concerns
    }
    score += windScore

    hourlyScores.push({ hour, score, tideHeight })
  }

  if (hourlyScores.length === 0) {
    return null
  }

  // Find the best consecutive 2-4 hour window
  let bestWindow = { startHour: 6, endHour: 9, avgScore: 0, avgTide: 0 }

  for (let windowSize = 3; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= hourlyScores.length - windowSize; i++) {
      const window = hourlyScores.slice(i, i + windowSize)
      const avgScore = window.reduce((sum, h) => sum + h.score, 0) / windowSize
      const avgTide = window.reduce((sum, h) => sum + h.tideHeight, 0) / windowSize

      if (avgScore > bestWindow.avgScore) {
        bestWindow = {
          startHour: window[0].hour,
          endHour: window[window.length - 1].hour + 1,
          avgScore,
          avgTide,
        }
      }
    }
  }

  // Generate reason based on time and tide
  let reason: string
  const isEarlyMorning = bestWindow.startHour >= 5 && bestWindow.startHour < 9
  const isEvening = bestWindow.startHour >= 17
  const tideDesc = getTideDescription(bestWindow.avgTide)

  if (isEarlyMorning) {
    reason = `${tideDesc} + light morning winds`
  } else if (isEvening) {
    reason = `${tideDesc} + evening glass-off`
  } else {
    reason = `${tideDesc} conditions`
  }

  return {
    start: formatHour(bestWindow.startHour),
    end: formatHour(bestWindow.endHour),
    reason,
  }
}

/**
 * Scores tide height for a specific time window
 */
function scoreTideForWindow(
  height: number,
  bestTide: 'low' | 'mid' | 'high' | 'any'
): number {
  if (bestTide === 'any') return 70

  // SF Bay typical tide range is roughly -1 to 6ft
  const tidePct = Math.min(1, Math.max(0, (height + 1) / 7))

  switch (bestTide) {
    case 'low':
      if (tidePct < 0.3) return 100
      if (tidePct < 0.45) return 80
      if (tidePct < 0.6) return 50
      return 20

    case 'mid':
      if (tidePct >= 0.35 && tidePct <= 0.65) return 100
      if (tidePct >= 0.25 && tidePct <= 0.75) return 80
      return 50

    case 'high':
      if (tidePct > 0.7) return 100
      if (tidePct > 0.55) return 80
      if (tidePct > 0.4) return 50
      return 20
  }

  return 50
}

/**
 * Gets a description of the tide level
 */
function getTideDescription(height: number): string {
  if (height < 1) return 'Low tide'
  if (height < 2.5) return 'Low-mid tide'
  if (height < 4) return 'Mid tide'
  if (height < 5) return 'Mid-high tide'
  return 'High tide'
}

/**
 * Formats hour number to AM/PM string
 */
function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}
