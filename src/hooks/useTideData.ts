import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchTodayTides, fetchTideData, fetchTideRange } from '../lib/api/tides'
import type { TideData } from '../types'

/**
 * Fetches today's tide data for a single station
 */
export function useTodayTides(stationId: string) {
  return useQuery<TideData, Error>({
    queryKey: ['tides', stationId, 'today'],
    queryFn: () => fetchTodayTides(stationId),
    staleTime: 1000 * 60 * 30, // 30 minutes - tide predictions don't change
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
    retry: 2,
  })
}

/**
 * Fetches tide data for a specific date
 */
export function useTideData(stationId: string, date: string, days = 1) {
  return useQuery<TideData, Error>({
    queryKey: ['tides', stationId, date, days],
    queryFn: () => fetchTideData({ stationId, date, days }),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  })
}

/**
 * Fetches tide data for a date range
 */
export function useTideRange(
  stationId: string,
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  return useQuery<TideData, Error>({
    queryKey: ['tides', stationId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => fetchTideRange(stationId, startDate, endDate),
    staleTime: 1000 * 60 * 60,
    enabled,
    retry: 2,
  })
}

/**
 * Fetches tide data for multiple stations for a specific date
 */
export function useMultipleTideData(stationIds: string[], date?: string) {
  // Deduplicate station IDs
  const uniqueStations = [...new Set(stationIds)]

  const queries = useQueries({
    queries: uniqueStations.map((stationId) => ({
      queryKey: ['tides', stationId, date || 'today'],
      queryFn: () => date
        ? fetchTideData({ stationId, date, days: 1 })
        : fetchTodayTides(stationId),
      staleTime: 1000 * 60 * 30,
      refetchInterval: date ? false : 1000 * 60 * 60, // Don't refetch future dates
      retry: 2,
    })),
  })

  // Aggregate results into a map
  const data = new Map<string, TideData | null>()
  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)
  const errors = queries.filter((q) => q.error).map((q) => q.error)

  queries.forEach((query, index) => {
    data.set(uniqueStations[index], query.data ?? null)
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
 * Gets unique tide station IDs from spot configurations
 */
export function getUniqueTideStations(
  spots: Array<{ tideStation: string }>
): string[] {
  return [...new Set(spots.map((s) => s.tideStation))]
}
