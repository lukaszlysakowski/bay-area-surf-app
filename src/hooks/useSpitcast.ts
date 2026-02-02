import { useQuery, useQueries } from '@tanstack/react-query'
import {
  fetchSpitcastDayForecast,
  fetchSpitcastForSpot,
  SPITCAST_SPOT_IDS,
  type SpitcastDayForecast,
} from '../lib/api/spitcast'

/**
 * Hook to fetch Spitcast forecast for a single spot
 */
export function useSpitcastForecast(spotId: string, date: Date) {
  return useQuery({
    queryKey: ['spitcast', spotId, date.toDateString()],
    queryFn: () => fetchSpitcastDayForecast(spotId, date),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!SPITCAST_SPOT_IDS[spotId],
  })
}

/**
 * Hook to fetch Spitcast forecasts for multiple spots
 */
export function useSpitcastForecasts(spotIds: string[], date: Date) {
  const queries = useQueries({
    queries: spotIds.map((spotId) => ({
      queryKey: ['spitcast', spotId, date.toDateString()],
      queryFn: () => fetchSpitcastDayForecast(spotId, date),
      staleTime: 1000 * 60 * 30,
      enabled: !!SPITCAST_SPOT_IDS[spotId],
    })),
  })

  // Build a map of spotId -> forecast
  const forecastMap = new Map<string, SpitcastDayForecast>()
  spotIds.forEach((spotId, index) => {
    const data = queries[index].data
    if (data) {
      forecastMap.set(spotId, data)
    }
  })

  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)

  return {
    forecastMap,
    isLoading,
    isError,
    queries,
  }
}

/**
 * Hook to fetch hourly Spitcast data for a spot
 */
export function useSpitcastHourly(spotId: string, date: Date) {
  return useQuery({
    queryKey: ['spitcast-hourly', spotId, date.toDateString()],
    queryFn: () => fetchSpitcastForSpot(spotId, date),
    staleTime: 1000 * 60 * 30,
    enabled: !!SPITCAST_SPOT_IDS[spotId],
  })
}
