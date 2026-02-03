import { useQuery } from '@tanstack/react-query'
import {
  fetchMarineForecast,
  fetchMarineForecastForSpot,
  type MarineForecast,
  type MarineDayForecast,
} from '../lib/api/openmeteo'

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
