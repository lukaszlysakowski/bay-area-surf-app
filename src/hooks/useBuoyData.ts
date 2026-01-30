import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchLatestBuoyData, fetchBuoyData } from '../lib/api/noaa'
import type { BuoyData } from '../types'

/**
 * Fetches the latest buoy data for a single station
 */
export function useBuoyData(stationId: string) {
  return useQuery<BuoyData | null, Error>({
    queryKey: ['buoy', stationId, 'latest'],
    queryFn: () => fetchLatestBuoyData(stationId),
    staleTime: 1000 * 60 * 5, // 5 minutes - buoy data updates every 10-30 min
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
    retry: 2,
  })
}

/**
 * Fetches historical buoy data for a single station
 */
export function useBuoyHistory(stationId: string, enabled = true) {
  return useQuery<BuoyData[], Error>({
    queryKey: ['buoy', stationId, 'history'],
    queryFn: () => fetchBuoyData(stationId),
    staleTime: 1000 * 60 * 5,
    enabled,
    retry: 2,
  })
}

/**
 * Fetches latest buoy data for multiple stations in parallel
 */
export function useMultipleBuoyData(stationIds: string[]) {
  const queries = useQueries({
    queries: stationIds.map((stationId) => ({
      queryKey: ['buoy', stationId, 'latest'],
      queryFn: () => fetchLatestBuoyData(stationId),
      staleTime: 1000 * 60 * 5,
      refetchInterval: 1000 * 60 * 10,
      retry: 2,
    })),
  })

  // Aggregate results into a map
  const data = new Map<string, BuoyData | null>()
  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)
  const errors = queries.filter((q) => q.error).map((q) => q.error)

  queries.forEach((query, index) => {
    data.set(stationIds[index], query.data ?? null)
  })

  return {
    data,
    isLoading,
    isError,
    errors,
    queries,
  }
}

/**
 * Gets unique buoy station IDs from spot configurations
 */
export function getUniqueBuoyStations(
  spots: Array<{ buoyStation: string }>
): string[] {
  return [...new Set(spots.map((s) => s.buoyStation))]
}
