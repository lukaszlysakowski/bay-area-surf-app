import { describe, it, expect } from 'vitest'
import { marineDayToConditions, circularMeanDeg } from './forecastConditions'
import type { MarineDayForecast, MarineForecastHour } from './api/openmeteo'

function hour(localHour: number, windMph: number, windDir: number): MarineForecastHour {
  return {
    time: new Date(2026, 6, 25, localHour, 0),
    waveHeight: 1, waveHeightFt: 3.3,
    wavePeriod: 13, waveDirection: 270,
    swellHeight: 1, swellHeightFt: 3.3, swellPeriod: 14, swellDirection: 270,
    windWaveHeight: 0.5, windWaveHeightFt: 1.6,
    windSpeed: windMph / 2.237, windSpeedMph: windMph,
    windDirection: windDir, windGusts: 0, windGustsMph: 0,
  }
}

function makeDay(overrides: Partial<MarineDayForecast> = {}): MarineDayForecast {
  return {
    date: new Date(2026, 6, 25),
    hourly: [
      hour(6, 4, 300), hour(7, 5, 300), hour(8, 4, 300), hour(9, 6, 300), hour(10, 8, 300),
      hour(13, 16, 300), hour(14, 17, 300), hour(15, 16, 300), // windy afternoon
    ],
    minWaveHeight: 3, maxWaveHeight: 5, avgWaveHeight: 3.9,
    dominantPeriod: 13, dominantDirection: 285,
    bestHour: null,
    avgWindSpeed: 10, maxWindSpeed: 17, avgWindDirection: 300,
    ...overrides,
  }
}

describe('circularMeanDeg', () => {
  it('averages bearings without the 360/0 wrap bug', () => {
    expect(circularMeanDeg([350, 10])).toBeCloseTo(0, 1)
  })
  it('handles a simple average', () => {
    expect(circularMeanDeg([90, 90])).toBeCloseTo(90, 5)
  })
  it('returns 0 for an empty list', () => {
    expect(circularMeanDeg([])).toBe(0)
  })
})

describe('marineDayToConditions', () => {
  it('takes waves from the day aggregates', () => {
    const c = marineDayToConditions(makeDay(), null)
    expect(c.waveHeight).toBe(3.9)
    expect(c.wavePeriod).toBe(13)
    expect(c.swellDirection).toBe(285)
  })

  it('uses the morning wind window, not the windy afternoon', () => {
    const c = marineDayToConditions(makeDay(), null)
    // Morning (6–10am) avg is ~5.4mph; the day average (incl. afternoon) is 10.
    expect(c.windSpeed).toBeGreaterThan(3)
    expect(c.windSpeed).toBeLessThan(8)
    expect(c.windSpeed).toBeLessThan(makeDay().avgWindSpeed)
  })

  it('falls back to all available hours when there is no morning window', () => {
    const noMorning = makeDay({ hourly: [hour(13, 16, 300), hour(14, 17, 300)] })
    const c = marineDayToConditions(noMorning, null)
    expect(c.windSpeed).toBeCloseTo(16.5, 1) // avg of the two afternoon hours
  })

  it('falls back to day aggregates when there are no hourly rows at all', () => {
    const noHourly = makeDay({ hourly: [] })
    const c = marineDayToConditions(noHourly, null)
    expect(c.windSpeed).toBe(noHourly.avgWindSpeed)
    expect(c.windDirection).toBe(noHourly.avgWindDirection)
  })

  it('leaves tide null when no tide data is supplied', () => {
    const c = marineDayToConditions(makeDay(), null)
    expect(c.tideHeight).toBeNull()
    expect(c.tidePhase).toBeNull()
  })

  it('passes through temperatures from the caller', () => {
    const c = marineDayToConditions(makeDay(), null, { waterTemp: 58, airTemp: 62 })
    expect(c.waterTemp).toBe(58)
    expect(c.airTemp).toBe(62)
  })
})
