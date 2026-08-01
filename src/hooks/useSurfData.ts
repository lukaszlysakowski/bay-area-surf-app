import { useMemo } from 'react'
import { useMultipleBuoyData, getUniqueBuoyStations } from './useBuoyData'
import { useMultipleTideData, getUniqueTideStations } from './useTideData'
import { useMultipleMarineForecasts, getForecastForDate } from './useMarineForecast'
import { SURF_SPOTS } from '../lib/spots'
import { scoreAndRankSpots, calculateSpotScore } from '../lib/scoring'
import { getTidePhase, getCurrentTideHeight } from '../lib/api/tides'
import { marineDayToConditions } from '../lib/forecastConditions'
import type { MarineDayForecast } from '../lib/api/openmeteo'
import type { SurfConditions, SpotConfig, SurfPreferences, BuoyData, TideData } from '../types'

interface UseSurfDataOptions {
  surferType: SurfPreferences['surferType']
  skillLevel: SurfPreferences['skillLevel']
  date?: string // YYYYMMDD format, undefined = today
}

/**
 * Main hook for fetching and scoring all surf spots
 * @param options.date - Optional date in YYYYMMDD format for tide predictions
 */
export function useSurfData(options: UseSurfDataOptions) {
  const { surferType, skillLevel, date } = options

  // Get unique station IDs from all spots
  const buoyStations = useMemo(() => getUniqueBuoyStations(SURF_SPOTS), [])
  const tideStations = useMemo(() => getUniqueTideStations(SURF_SPOTS), [])

  // Is the selected date a future day? Today/now (date undefined, or equal to
  // today's YYYYMMDD as the "now" tab passes) uses the live buoy — most accurate
  // for right now. Future dates use the Open-Meteo forecast (waves + wind).
  const now = new Date()
  const todayApi = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const isFutureDate = !!date && date !== todayApi
  const targetDate = useMemo(
    () =>
      date
        ? new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)))
        : new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date]
  )

  // Fetch data from all stations.
  // Buoy is always real-time (NOAA doesn't forecast); tide is date-specific. The
  // marine forecast is always fetched: future dates score on it, and every date
  // uses it for the Best Surf Times windows (real wind + swell + tide).
  const buoyQueries = useMultipleBuoyData(buoyStations)
  const tideQueries = useMultipleTideData(tideStations, date)
  const marineQueries = useMultipleMarineForecasts(SURF_SPOTS, true)

  // Build conditions map for each spot
  const conditionsMap = useMemo(() => {
    const map = new Map<string, SurfConditions>()

    for (const spot of SURF_SPOTS) {
      const buoyData = buoyQueries.data.get(spot.buoyStation)
      const tideData = tideQueries.data.get(spot.tideStation)

      if (isFutureDate) {
        // Future date: score on the forecast for that day (waves + morning wind).
        const forecast = marineQueries.data.get(spot.id)
        const day = getForecastForDate(forecast ?? undefined, targetDate)
        if (day) {
          map.set(
            spot.id,
            marineDayToConditions(day, tideData ?? null, {
              waterTemp: buoyData?.waterTemp,
              airTemp: buoyData?.airTemp,
            })
          )
        }
        continue
      }

      // Today/now: prefer the live buoy (most accurate for right now). Tide is
      // supplementary, so build as soon as wave data is present.
      if (buoyData) {
        map.set(spot.id, buildConditions(buoyData, tideData ?? null))
        continue
      }

      // Buoy unavailable (NDBC outage) — fall back to today's forecast so the
      // page never blanks. Slightly less "live", but the spot stays ranked.
      const forecast = marineQueries.data.get(spot.id)
      const day = getForecastForDate(forecast ?? undefined, targetDate)
      if (day) {
        map.set(spot.id, marineDayToConditions(day, tideData ?? null))
      }
    }

    return map
  }, [buoyQueries.data, tideQueries.data, marineQueries.data, isFutureDate, targetDate])

  // Score and rank spots
  const rankedSpots = useMemo(() => {
    if (conditionsMap.size === 0) return []

    return scoreAndRankSpots(SURF_SPOTS, conditionsMap, {
      surferType,
      skillLevel,
    })
  }, [conditionsMap, surferType, skillLevel])

  // Get the best spot
  const bestSpot = rankedSpots.length > 0 ? rankedSpots[0] : null

  // Build tide data map by spot ID
  const tideDataMap = useMemo(() => {
    const map = new Map<string, TideData>()
    for (const spot of SURF_SPOTS) {
      const tideData = tideQueries.data.get(spot.tideStation)
      if (tideData) {
        map.set(spot.id, tideData)
      }
    }
    return map
  }, [tideQueries.data])

  // Per-spot marine forecast for the selected day — powers the Best Surf Times
  // windows (real hourly wind + swell) for every date.
  const marineDayMap = useMemo(() => {
    const map = new Map<string, MarineDayForecast>()
    for (const spot of SURF_SPOTS) {
      const forecast = marineQueries.data.get(spot.id)
      const day = getForecastForDate(forecast ?? undefined, targetDate)
      if (day) map.set(spot.id, day)
    }
    return map
  }, [marineQueries.data, targetDate])

  return {
    spots: rankedSpots,
    bestSpot,
    conditionsMap,
    tideDataMap,
    marineDayMap,
    // Marine normally loads in the background on today/now (Best Surf Times
    // upgrade when it arrives) and doesn't delay the buoy-driven ranking. But if
    // the buoy has failed, marine becomes today's rescue source, so wait for it
    // rather than flashing an empty/error state.
    isLoading:
      buoyQueries.isLoading ||
      tideQueries.isLoading ||
      ((isFutureDate || buoyQueries.isError) && marineQueries.isLoading),
    // Only blank the page when no spot has usable conditions. conditionsMap holds
    // only spots whose source data loaded (scoreAndRankSpots pads the rest with a
    // "no data" placeholder, so rankedSpots is always the full list and can't be
    // used here). A partial outage still renders the spots that loaded. Future
    // dates rely on the forecast; today/now prefers the buoy but falls back to
    // the forecast, so it only errors once the forecast has also failed.
    isError:
      conditionsMap.size === 0 &&
      (isFutureDate
        ? marineQueries.isError
        : buoyQueries.isError && marineQueries.isError),
    errors: [...buoyQueries.errors, ...tideQueries.errors],
  }
}

/**
 * Hook for getting scored data for a single spot
 */
export function useSpotScore(
  spot: SpotConfig,
  options: UseSurfDataOptions
) {
  const { surferType, skillLevel } = options

  // Fetch data for this spot's stations
  const buoyQueries = useMultipleBuoyData([spot.buoyStation])
  const tideQueries = useMultipleTideData([spot.tideStation])

  const buoyData = buoyQueries.data.get(spot.buoyStation)
  const tideData = tideQueries.data.get(spot.tideStation)

  // Calculate score
  const result = useMemo(() => {
    if (!buoyData) return null

    const conditions = buildConditions(buoyData, tideData ?? null)
    return {
      conditions,
      ...calculateSpotScore(conditions, spot, { surferType, skillLevel }),
    }
  }, [buoyData, tideData, spot, surferType, skillLevel])

  return {
    data: result,
    buoyData,
    tideData,
    isLoading: buoyQueries.isLoading || tideQueries.isLoading,
    // Tide failures degrade gracefully; only wave-data failure is a hard error.
    isError: buoyQueries.isError,
  }
}

/**
 * Builds SurfConditions from buoy and tide data
 */
function buildConditions(buoyData: BuoyData, tideData: TideData | null): SurfConditions {
  return {
    waveHeight: buoyData.waveHeight,
    wavePeriod: buoyData.wavePeriod,
    swellDirection: buoyData.waveDirection,
    windSpeed: buoyData.windSpeed,
    windDirection: buoyData.windDirection,
    tideHeight: tideData ? getCurrentTideHeight(tideData) : null,
    tidePhase: tideData ? getTidePhase(tideData) : null,
    waterTemp: buoyData.waterTemp,
    airTemp: buoyData.airTemp,
  }
}

/**
 * Gets spots filtered by region
 */
export function getSpotsByRegion(
  spots: Array<SpotConfig & { score: number }>,
  region: string
): Array<SpotConfig & { score: number }> {
  if (region === 'all') return spots
  return spots.filter((spot) => spot.region === region)
}

/**
 * Gets spots filtered by minimum score
 */
export function getSpotsByMinScore(
  spots: Array<SpotConfig & { score: number }>,
  minScore: number
): Array<SpotConfig & { score: number }> {
  return spots.filter((spot) => spot.score >= minScore)
}

/**
 * Gets unique regions from spots
 */
export function getUniqueRegions(): string[] {
  return [...new Set(SURF_SPOTS.map((s) => s.region))]
}
