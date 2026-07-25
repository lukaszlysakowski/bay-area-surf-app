import { useQuery, useQueries } from '@tanstack/react-query'
import {
  fetchMarineForecast,
  fetchMarineForecastForSpot,
  type MarineForecast,
  type MarineDayForecast,
} from '../lib/api/openmeteo'

/**
 * Fetches marine forecasts for many spots in parallel (one query per spot's
 * coordinates). Used to score future dates on the actual forecast. Pass
 * `enabled: false` to keep it dormant for today/now, so no extra requests fire.
 */
export function useMultipleMarineForecasts(
  spots: Array<{ id: string; coordinates: { lat: number; lng: number } }>,
  enabled: boolean,
  days = 8 // cover the furthest selectable tab (up to 7 days out, inclusive)
) {
  const queries = useQueries({
    queries: spots.map((s) => ({
      queryKey: ['marine-forecast', s.coordinates.lat, s.coordinates.lng, days],
      queryFn: () => fetchMarineForecastForSpot(s.coordinates, days),
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      enabled,
    })),
  })

  const data = new Map<string, MarineForecast | null>()
  spots.forEach((s, i) => data.set(s.id, queries[i].data ?? null))

  return {
    data,
    isLoading: enabled && queries.some((q) => q.isLoading),
    isError: enabled && queries.some((q) => q.isError),
  }
}

/**
 * Hook to fetch marine forecast for coordinates
 */
export function useMarineForecast(lat: number, lng: number, days: number = 7) {
  return useQuery({
    queryKey: ['marine-forecast', lat, lng, days],
    queryFn: () => fetchMarineForecast(lat, lng, days),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour cache
    enabled: !!lat && !!lng,
  })
}

/**
 * Hook to fetch marine forecast for a spot
 */
export function useSpotMarineForecast(
  coordinates: { lat: number; lng: number } | undefined,
  days: number = 7
) {
  return useQuery({
    queryKey: ['marine-forecast', coordinates?.lat, coordinates?.lng, days],
    queryFn: () => fetchMarineForecastForSpot(coordinates!, days),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: !!coordinates,
  })
}

/**
 * Helper to get forecast for a specific date from the marine forecast
 */
export function getForecastForDate(
  forecast: MarineForecast | undefined,
  date: Date
): MarineDayForecast | undefined {
  if (!forecast) return undefined

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  return forecast.days.find((day) => {
    const dayDate = new Date(day.date)
    dayDate.setHours(0, 0, 0, 0)
    return dayDate.getTime() === targetDate.getTime()
  })
}

export type { MarineForecast, MarineDayForecast }
