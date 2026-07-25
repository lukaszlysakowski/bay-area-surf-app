import type { SurfConditions, TideData } from '../types'
import type { MarineDayForecast } from './api/openmeteo'
import { getCurrentTideHeight, getTidePhase } from './api/tides'

/** Circular (vector) mean of compass bearings, in degrees 0–360. */
export function circularMeanDeg(degrees: number[]): number {
  if (degrees.length === 0) return 0
  let x = 0
  let y = 0
  for (const d of degrees) {
    const r = (d * Math.PI) / 180
    x += Math.cos(r)
    y += Math.sin(r)
  }
  const mean = (Math.atan2(y, x) * 180) / Math.PI
  return (mean + 360) % 360
}

/**
 * Maps an Open-Meteo marine day forecast into the SurfConditions the scorer
 * expects, so future-date rankings reflect that day's forecast instead of the
 * live buoy.
 *
 * Waves use the day's aggregates. Wind uses the morning (6–10am) window — when
 * people actually surf and before the afternoon onshore thermal fills in — so a
 * glassy-dawn day isn't unfairly penalised by midday wind. Tide and temperature
 * are supplied by the caller (tide predictions and the live buoy).
 */
export function marineDayToConditions(
  day: MarineDayForecast,
  tideData: TideData | null,
  temps?: { waterTemp?: number; airTemp?: number }
): SurfConditions {
  const morning = day.hourly.filter((h) => {
    const hr = h.time.getHours()
    return hr >= 6 && hr <= 10
  })
  const windHours = morning.length > 0 ? morning : day.hourly

  const windSpeed =
    windHours.length > 0
      ? windHours.reduce((sum, h) => sum + h.windSpeedMph, 0) / windHours.length
      : day.avgWindSpeed
  const windDirection =
    windHours.length > 0
      ? circularMeanDeg(windHours.map((h) => h.windDirection))
      : day.avgWindDirection

  return {
    waveHeight: day.avgWaveHeight,
    wavePeriod: day.dominantPeriod,
    swellDirection: day.dominantDirection,
    windSpeed,
    windDirection,
    tideHeight: tideData ? getCurrentTideHeight(tideData) : null,
    tidePhase: tideData ? getTidePhase(tideData) : null,
    waterTemp: temps?.waterTemp,
    airTemp: temps?.airTemp,
  }
}
