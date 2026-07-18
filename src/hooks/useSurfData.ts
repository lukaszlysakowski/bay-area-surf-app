import { useMemo } from 'react'
import { useMultipleBuoyData, getUniqueBuoyStations } from './useBuoyData'
import { useMultipleTideData, getUniqueTideStations } from './useTideData'
import { SURF_SPOTS } from '../lib/spots'
import { scoreAndRankSpots, calculateSpotScore } from '../lib/scoring'
import { getTidePhase, getCurrentTideHeight } from '../lib/api/tides'
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

  // Fetch data from all stations
  // Note: Buoy data is always real-time (NOAA doesn't provide forecasts)
  // Tide data can be for a specific date
  const buoyQueries = useMultipleBuoyData(buoyStations)
  const tideQueries = useMultipleTideData(tideStations, date)

  // Build conditions map for each spot
  const conditionsMap = useMemo(() => {
    const map = new Map<string, SurfConditions>()

    for (const spot of SURF_SPOTS) {
      const buoyData = buoyQueries.data.get(spot.buoyStation)
      const tideData = tideQueries.data.get(spot.tideStation)

      // Buoy (wave) data is essential; tide is supplementary. Build conditions
      // as soon as wave data is present so a failed tide station never drops
      // the spot from the ranking.
      if (buoyData) {
        map.set(spot.id, buildConditions(buoyData, tideData ?? null))
      }
    }

    return map
  }, [buoyQueries.data, tideQueries.data])

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

  return {
    spots: rankedSpots,
    bestSpot,
    conditionsMap,
    tideDataMap,
    isLoading: buoyQueries.isLoading || tideQueries.isLoading,
    // Only blank the page when no spot has usable wave data. conditionsMap holds
    // only spots whose buoy loaded (scoreAndRankSpots pads the rest with a
    // "no data" placeholder, so rankedSpots is always the full list and can't be
    // used here). A partial buoy outage still renders the spots that loaded;
    // tide outages already degrade gracefully.
    isError: buoyQueries.isError && conditionsMap.size === 0,
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
