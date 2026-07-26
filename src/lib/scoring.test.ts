import { describe, it, expect } from 'vitest'
import {
  scoreWaveHeight,
  scoreWavePeriod,
  scoreWind,
  scoreSwellDirection,
  scoreTide,
  calculateSpotScore,
  scoreAndRankSpots,
  calculateBestTimeWindow,
} from './scoring'
import type { SpotConfig, SurfConditions, TideData } from '../types'
import type { MarineDayForecast, MarineForecastHour } from './api/openmeteo'

function makeSpot(overrides: Partial<SpotConfig> = {}): SpotConfig {
  return {
    id: 'test-spot',
    name: 'Test Spot',
    description: 'A test break',
    coordinates: { lat: 37.8, lng: -122.5 },
    region: 'Bay Area',
    optimalSwellDirections: [270, 290, 310],
    offshoreWindDirection: 90, // wind from the east is offshore
    bestTide: 'mid',
    buoyStation: '00000',
    tideStation: '00000',
    breakType: 'beach',
    skillLevel: 'intermediate',
    ...overrides,
  }
}

function makeConditions(overrides: Partial<SurfConditions> = {}): SurfConditions {
  return {
    waveHeight: 4,
    wavePeriod: 14,
    swellDirection: 290,
    windSpeed: 3,
    windDirection: 90,
    tideHeight: 3,
    tidePhase: 'rising',
    ...overrides,
  }
}

describe('scoreWaveHeight', () => {
  it('gives a perfect score inside the ideal range', () => {
    // mediumboard/advanced ideal is 3-6ft
    expect(scoreWaveHeight(4, 'mediumboard', 'advanced')).toBe(100)
  })

  it('penalises waves that are too small', () => {
    expect(scoreWaveHeight(0.5, 'mediumboard', 'advanced')).toBeLessThan(40)
  })

  it('penalises waves that are far too big', () => {
    expect(scoreWaveHeight(20, 'mediumboard', 'advanced')).toBeLessThan(20)
  })

  it('falls back to a neutral score for an unknown config', () => {
    expect(scoreWaveHeight(4, 'nonexistent', 'nope')).toBe(50)
  })
})

describe('scoreWavePeriod', () => {
  it('rewards long-period groundswell', () => {
    expect(scoreWavePeriod(16)).toBe(100)
  })

  it('scores short wind swell low', () => {
    expect(scoreWavePeriod(5)).toBe(20)
  })

  it('is monotonic across the buckets', () => {
    const periods = [6, 8, 10, 12, 14, 16]
    const scores = periods.map(scoreWavePeriod)
    const sorted = [...scores].sort((a, b) => a - b)
    expect(scores).toEqual(sorted)
  })
})

describe('scoreWind', () => {
  it('rates glassy offshore wind as perfect', () => {
    // speed < 5 -> 100, direction offshore -> full multiplier
    expect(scoreWind(2, 90, 90)).toBe(100)
  })

  it('drops sharply for howling onshore wind', () => {
    // 30mph onshore (opposite of offshore)
    expect(scoreWind(30, 270, 90)).toBeLessThan(15)
  })
})

describe('scoreSwellDirection', () => {
  it('scores a direct hit at 100', () => {
    expect(scoreSwellDirection(290, [270, 290, 310])).toBe(100)
  })

  it('scores an opposing swell low', () => {
    expect(scoreSwellDirection(110, [290])).toBe(10)
  })
})

describe('scoreTide', () => {
  it('returns a neutral score when tide is unavailable (null)', () => {
    // The resilience fix: a null tide must not distort ranking.
    expect(scoreTide(null, null, 'low')).toBe(80)
    expect(scoreTide(null, null, 'high')).toBe(80)
    expect(scoreTide(null, null, 'any')).toBe(80)
  })

  it('returns neutral for spots with no tide preference', () => {
    expect(scoreTide(2, 'rising', 'any')).toBe(80)
  })

  it('rewards low water at a low-tide spot', () => {
    expect(scoreTide(1, 'rising', 'low')).toBe(100)
  })

  it('penalises high water at a low-tide spot', () => {
    expect(scoreTide(5.5, 'falling', 'low')).toBeLessThan(scoreTide(1, 'rising', 'low'))
  })

  it('rewards high water at a high-tide spot', () => {
    expect(scoreTide(5, 'rising', 'high')).toBe(100)
  })
})

describe('calculateSpotScore', () => {
  it('produces an Excellent rating for great conditions', () => {
    const result = calculateSpotScore(makeConditions(), makeSpot(), {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })
    expect(result.rating).toBe('Excellent')
    expect(result.score).toBeGreaterThanOrEqual(80)
  })

  it('produces a Poor rating for terrible conditions', () => {
    const bad = makeConditions({
      waveHeight: 0.3,
      wavePeriod: 5,
      windSpeed: 30,
      windDirection: 270, // onshore
      swellDirection: 110, // wrong way
    })
    const result = calculateSpotScore(bad, makeSpot(), {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })
    expect(result.rating).toBe('Poor')
  })

  it('still scores a spot when tide data is missing (does not throw)', () => {
    const noTide = makeConditions({ tideHeight: null, tidePhase: null })
    const result = calculateSpotScore(noTide, makeSpot(), {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })
    expect(result.rating).toBe('Excellent')
    expect(Number.isFinite(result.score)).toBe(true)
  })

  it('clamps the score to 0-100', () => {
    const result = calculateSpotScore(makeConditions(), makeSpot(), {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe('scoreAndRankSpots', () => {
  it('sorts spots by score, highest first', () => {
    const good = makeSpot({ id: 'good' })
    const poor = makeSpot({ id: 'poor' })
    const conditions = new Map<string, SurfConditions>([
      ['good', makeConditions()],
      ['poor', makeConditions({ waveHeight: 0.3, wavePeriod: 5, windSpeed: 30, windDirection: 270, swellDirection: 110 })],
    ])

    const ranked = scoreAndRankSpots([poor, good], conditions, {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })

    expect(ranked[0].id).toBe('good')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('pads spots with no conditions as a "no data" placeholder rather than dropping them', () => {
    const withData = makeSpot({ id: 'has-data' })
    const noData = makeSpot({ id: 'no-data' })
    const conditions = new Map<string, SurfConditions>([['has-data', makeConditions()]])

    const ranked = scoreAndRankSpots([withData, noData], conditions, {
      surferType: 'mediumboard',
      skillLevel: 'advanced',
    })

    // Both spots are present (this is why useSurfData gates on conditionsMap.size).
    expect(ranked).toHaveLength(2)
    const placeholder = ranked.find((s) => s.id === 'no-data')!
    expect(placeholder.score).toBe(0)
    expect(placeholder.rating).toBe('Poor')
    expect(placeholder.breakdown).toMatch(/no conditions data/i)
  })
})

// --- Best time window (forecast-driven) ---

function tideHourly(): TideData {
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    time: `2026-07-25T${String(h).padStart(2, '0')}:00:00`,
    height: 3, // flat tide so wind/swell decide the window
    type: null,
  }))
  return { hourly, highLow: [] }
}

function marineHour(localHour: number, windMph: number): MarineForecastHour {
  return {
    time: new Date(2026, 6, 25, localHour, 0),
    waveHeight: 1.2, waveHeightFt: 3.9,
    wavePeriod: 13, waveDirection: 270,
    swellHeight: 1.2, swellHeightFt: 3.9, swellPeriod: 13, swellDirection: 270,
    windWaveHeight: 0.4, windWaveHeightFt: 1.3,
    windSpeed: windMph / 2.237, windSpeedMph: windMph,
    windDirection: 300, windGusts: 0, windGustsMph: 0,
  }
}

function marineDay(): MarineDayForecast {
  // Glassy morning, windy afternoon.
  const hourly = [
    marineHour(6, 4), marineHour(7, 4), marineHour(8, 5), marineHour(9, 7), marineHour(10, 10),
    marineHour(12, 16), marineHour(13, 17), marineHour(14, 17), marineHour(15, 16),
  ]
  return {
    date: new Date(2026, 6, 25), hourly,
    minWaveHeight: 3.9, maxWaveHeight: 3.9, avgWaveHeight: 3.9,
    dominantPeriod: 13, dominantDirection: 270, bestHour: null,
    avgWindSpeed: 11, maxWindSpeed: 17, avgWindDirection: 300,
  }
}

describe('calculateBestTimeWindow', () => {
  it('returns null without tide data', () => {
    expect(calculateBestTimeWindow({ hourly: [], highLow: [] }, 'any')).toBeNull()
  })

  it('with a forecast, picks the glassy morning over the windy afternoon', () => {
    const win = calculateBestTimeWindow(tideHourly(), 'any', {
      marineDay: marineDay(),
      offshoreWindDirection: 45,
    })
    expect(win).not.toBeNull()
    // Window should start in the morning (before ~10am), not the windy afternoon.
    expect(win!.start).toMatch(/AM/)
    const startHour = parseInt(win!.start)
    expect(startHour).toBeLessThanOrEqual(9)
  })

  it('builds the reason from real conditions when a forecast is given', () => {
    const win = calculateBestTimeWindow(tideHourly(), 'any', {
      marineDay: marineDay(),
      offshoreWindDirection: 45,
    })
    // Morning wind ~4mph -> "glassy", plus the swell size.
    expect(win!.reason).toMatch(/glassy/i)
    expect(win!.reason).toMatch(/ft/)
  })

  it('falls back to the time-of-day heuristic without a forecast', () => {
    const win = calculateBestTimeWindow(tideHourly(), 'any')
    expect(win).not.toBeNull()
    // Heuristic favours dawn and uses the old wording.
    expect(win!.reason).toMatch(/morning|glass-off|conditions/i)
  })
})
