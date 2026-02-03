import { useQuery } from '@tanstack/react-query'
import {
  fetchWeatherForecast,
  type WeatherForecast,
  type WeatherDay,
} from '../lib/api/weather'

/**
 * Hook to fetch weather forecast
 */
export function useWeatherForecast(lat: number, lng: number, days: number = 7) {
  return useQuery({
    queryKey: ['weather-forecast', lat, lng, days],
    queryFn: () => fetchWeatherForecast(lat, lng, days),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour cache
    enabled: !!lat && !!lng,
  })
}

/**
 * Helper to get weather for a specific date
 */
export function getWeatherForDate(
  forecast: WeatherForecast | undefined,
  date: Date
): WeatherDay | undefined {
  if (!forecast) return undefined

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  return forecast.days.find((day) => {
    const dayDate = new Date(day.date)
    dayDate.setHours(0, 0, 0, 0)
    return dayDate.getTime() === targetDate.getTime()
  })
}

export type { WeatherForecast, WeatherDay }
